#!/usr/bin/env python3
# Каталожные изображения 13 STYLES: скачиваем ОРИГИНАЛЬНЫЕ фото товаров
# (фон не трогаем, только конверт в .webp) и бракуем товары, на фото которых
# есть человек или части тела. Результат — data/catalog-manifest.json
# Запуск: python3 scripts/build-catalog-images.py

import io
import json
import os
import sys
import threading
import time
from concurrent.futures import ProcessPoolExecutor, as_completed

import cv2
import numpy as np
import requests
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAN_PATH = os.path.join(ROOT, 'data', 'import-plan.json')
MANIFEST_PATH = os.path.join(ROOT, 'data', 'catalog-manifest.json')
OUT_DIR = os.path.join(ROOT, 'public', 'products', 'catalog')
LOG_PATH = os.path.join(ROOT, 'data', 'catalog-images.log')

WORKERS = 8          # процессов (изоляция: segfault в cv2 не убивает скрипт)
MAX_IMAGES = 3        # фото на товар
DL_TIMEOUT = 20       # сек на запрос
MAX_SIDE = 1200       # верхний предел размера (без апскейла)
WEBP_Q = 85
HEADERS = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'}

_tl = threading.local()


def log(msg):
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(LOG_PATH, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def get_detectors():
    # Каскады и HOG грузим один раз на поток
    if not hasattr(_tl, 'ready'):
        base = cv2.data.haarcascades
        _tl.face = cv2.CascadeClassifier(base + 'haarcascade_frontalface_default.xml')
        _tl.profile = cv2.CascadeClassifier(base + 'haarcascade_profileface.xml')
        _tl.upper = cv2.CascadeClassifier(base + 'haarcascade_upperbody.xml')
        _tl.full = cv2.CascadeClassifier(base + 'haarcascade_fullbody.xml')
        _tl.hog = cv2.HOGDescriptor()
        _tl.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        _tl.ready = True


def has_person(pil_img):
    """True — на фото обнаружен человек или часть человека."""
    get_detectors()  # в отдельном процессе загрузится один раз
    scale = 480.0 / max(pil_img.size)
    small = pil_img if scale >= 1 else pil_img.resize(
        (max(1, int(pil_img.width * scale)), max(1, int(pil_img.height * scale))), Image.BILINEAR)
    gray = cv2.cvtColor(np.array(small.convert('RGB')), cv2.COLOR_RGB2GRAY)
    gray = cv2.equalizeHist(gray)
    for cascade, nb in ((_tl.face, 5), (_tl.upper, 4), (_tl.full, 4)):
        if len(cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=nb, minSize=(36, 36))):
            return True
    if len(_tl.profile.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=5, minSize=(36, 36))):
        return True
    if len(_tl.profile.detectMultiScale(cv2.flip(gray, 1), scaleFactor=1.08, minNeighbors=5, minSize=(36, 36))):
        return True
    try:
        rects, _ = _tl.hog.detectMultiScale(gray, winStride=(8, 8), padding=(4, 4), scale=1.05)
        if len(rects):
            return True
    except cv2.error:
        pass
    return False


def fetch(url):
    for attempt in range(3):
        try:
            r = requests.get(url, headers=HEADERS, timeout=DL_TIMEOUT)
            if r.status_code == 200 and r.content:
                return r.content
        except Exception:
            pass
        time.sleep(0.8 * (attempt + 1))
    return None


def to_webp(raw, path):
    img = Image.open(io.BytesIO(raw))
    img = ImageOps.exif_transpose(img)
    if img.mode != 'RGB':
        img = img.convert('RGB')
    w, h = img.size
    if max(w, h) > MAX_SIDE:
        k = MAX_SIDE / float(max(w, h))
        img = img.resize((int(w * k), int(h * k)), Image.LANCZOS)
    img.save(path, 'WEBP', quality=WEBP_Q)


def process_product(product):
    """Скачивает фото товара, проверяет на людей, сохраняет .webp.
    Возвращает (slug, status, images) где status: ok|person|no_images"""
    slug = product['slug']
    urls = product['images'][:MAX_IMAGES]
    frames = []          # [(n, PIL)] в памяти, сохраняем только чистые
    for n, url in enumerate(urls, 1):
        raw = fetch(url)
        if not raw:
            continue
        try:
            img = ImageOps.exif_transpose(Image.open(io.BytesIO(raw)))
            if img.mode != 'RGB':
                img = img.convert('RGB')
        except Exception:
            continue
        # Брак сразу при первом фото с человеком — остальное не качаем
        if has_person(img):
            return slug, 'person', []
        frames.append((n, img))
    if not frames:
        return slug, 'no_images', []
    images = []
    for n, img in frames:
        w, h = img.size
        if max(w, h) > MAX_SIDE:
            k = MAX_SIDE / float(max(w, h))
            img = img.resize((int(w * k), int(h * k)), Image.LANCZOS)
        rel = f"/products/catalog/{slug}-{n}.webp"
        img.save(os.path.join(OUT_DIR, f"{slug}-{n}.webp"), 'WEBP', quality=WEBP_Q)
        images.append(rel)
    return slug, 'ok', images


def load_resume():
    """Файлы {slug}-{n}.webp на диске = уже чистые товары прошлых запусков."""
    by_slug = {}
    if not os.path.isdir(OUT_DIR):
        return by_slug
    for fname in os.listdir(OUT_DIR):
        if fname.endswith('.webp') and '-' in fname:
            slug = fname.rsplit('-', 1)[0]
            rel = f"/products/catalog/{fname}"
            by_slug.setdefault(slug, []).append(rel)
    for slug in by_slug:
        by_slug[slug].sort(key=lambda s: int(s.rsplit('-', 1)[1].split('.')[0]))
    return by_slug


def save_manifest(manifest, total, rejected):
    manifest = sorted(manifest, key=lambda p: p['slug'])
    json.dump({'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
               'cleanTotal': total, 'rejected': sorted(rejected), 'products': manifest},
              open(MANIFEST_PATH, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    plan = json.load(open(PLAN_PATH, encoding='utf-8'))
    products = plan['products']
    clean = load_resume()
    manifest = [{'slug': s, 'images': imgs} for s, imgs in clean.items()]
    rejected = set()
    if os.path.exists(MANIFEST_PATH):
        try:
            rejected = set(json.load(open(MANIFEST_PATH, encoding='utf-8')).get('rejected') or [])
        except Exception:
            rejected = set()
    todo = [p for p in products if p['slug'] not in clean and p['slug'] not in rejected]
    stats = {'ok': 0, 'person': 0, 'no_images': 0}
    done = 0
    log(f"старт: всего {len(products)}, чисто на диске {len(clean)}, брак ранее {len(rejected)}, к обработке {len(todo)}")

    lock = threading.Lock()
    with ProcessPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(process_product, p): p['slug'] for p in todo}
        for fut in as_completed(futures):
            slug = futures[fut]
            try:
                slug, status, images = fut.result()
            except Exception as e:
                log(f"ОШИБКА {slug}: {e}")
                with lock:
                    done += 1
                continue
            with lock:
                done += 1
                stats[status] += 1
                if status == 'ok':
                    manifest.append({'slug': slug, 'images': images})
                if status == 'person':
                    rejected.add(slug)
                if done % 100 == 0:
                    log(f"{done}/{len(todo)} • чисто {stats['ok']} • с человеком {stats['person']} • без фото {stats['no_images']}")
                    save_manifest(manifest, len(products), rejected)

    save_manifest(manifest, len(products), rejected)
    log(f"ГОТОВО: чисто {stats['ok']} (+{len(clean)} ранее) / {len(products)} • брак(человек) {stats['person']} • без фото {stats['no_images']}")


if __name__ == '__main__':
    main()
