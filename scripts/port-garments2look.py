#!/usr/bin/env python3
# Порт фото Garments2Look (Mytheresa + Polyvore) из HF-бакета в витрину 13 STYLES.
# Работает по раундам: докачивает частичный tar.gz (curl -C -), затем извлекает
# ПРЕФИКС архива (gzip декодируется до точки обрыва), конвертирует фото в webp
# 640px и ПУБЛИКУЕТ товары в БД инкрементально (коммит каждые 300 товаров —
# прогресс не теряется даже при обрыве раунда).
# Повторный запуск продолжает с того же места (state-файл).
#
# Режим ПОТОКА (без записи tar на диск — для хвоста шарда, когда нет места):
#   curl -sL 'https://huggingface.co/buckets/nyushanyusha82/Garments2Look-bucket/resolve/polyvore/images-00000.tar.gz?download=true' \
#     | python3 scripts/port-garments2look.py --source pv --stdin
# Уже сделанные товары пропускаются по state-файлу, новые конвертируются пулом потоков.
#
# Полный порт на большой машине: python3 scripts/port-garments2look.py --source my --cap-gb 380
# Раунд докачки+извлечения: python3 scripts/port-garments2look.py --source pv --shard 0 --download-sec 540

import argparse
import gzip
import io
import json
import os
import sqlite3
import subprocess
import sys
import tarfile
import time
import zlib
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

from PIL import Image, ImageOps

ROOT = '/home/z/my-project'
SHARD_DIR = '/tmp/g2l-shards'
STATE_DIR = SHARD_DIR
OUT_DIR = os.path.join(ROOT, 'public', 'products', 'g2l')
DB_PATH = os.path.join(ROOT, 'db', 'custom.db')

BUCKET = 'https://huggingface.co/buckets/nyushanyusha82/Garments2Look-bucket/resolve'
IMG_PRIORITY = [('product', 'full'), ('product', 'partial'), ('model', 'partial'), ('model', 'full')]
MAX_IMAGES_PER_ITEM = {'my': 3, 'pv': 1}
COMMIT_EVERY = 300


def load_items_meta(source):
    """JSON метаданные -> {filename: (slug, [допустимые файлы в порядке приоритета])}"""
    src_dir = 'mytheresa' if source == 'my' else 'polyvore'
    gz = os.path.join(ROOT, 'data', 'garments2look', f'{src_dir}_image_v1.0_2512.json.gz')
    with gzip.open(gz, 'rt', encoding='utf-8') as f:
        items = json.load(f)
    file_map = {}
    for key, item in items.items():
        slug = f"g2l-{'my' if source == 'my' else 'pv'}-{str(key).lower()}"
        ordered = []
        for grp, sub in IMG_PRIORITY:
            for fn in item.get('images', {}).get(grp, {}).get(sub, []) or []:
                if fn and fn not in ordered:
                    ordered.append(fn)
        ordered = ordered[:MAX_IMAGES_PER_ITEM[source]]
        for fn in ordered:
            file_map[fn] = (slug, ordered)
    return file_map


def download_round(source, sec, cap_bytes, shard=0):
    src_dir = 'mytheresa' if source == 'my' else 'polyvore'
    remote = f'{src_dir}/images-{shard:05d}.tar.gz'
    fname = f'{src_dir}-{shard:05d}.tar.gz'
    path = os.path.join(SHARD_DIR, fname)
    have = os.path.getsize(path) if os.path.exists(path) else 0
    if have >= cap_bytes:
        print(f'[port] {fname}: {have} байт уже >= капа {cap_bytes} — докачка не нужна', flush=True)
        return path
    remain = min(cap_bytes - have, max(0, sec * 2_500_000))
    if remain <= 0:
        return path
    url = f'{BUCKET}/{remote}?download=true'
    print(f'[port] докачка {fname}: +{remain} байт (сейчас {have})', flush=True)
    subprocess.run(['curl', '-sL', '-C', '-', '--max-time', str(sec), '--speed-time', '30',
                    '--speed-limit', '10000', url, '-o', path], check=False)
    print(f'[port] файл сейчас: {os.path.getsize(path)} байт', flush=True)
    return path


def convert_to_webp(raw, out_path):
    img = Image.open(io.BytesIO(raw))
    img = ImageOps.exif_transpose(img)
    if img.mode != 'RGB':
        img = img.convert('RGB')
    img.thumbnail((640, 640), Image.LANCZOS)
    img.save(out_path, format='WEBP', quality=80, method=3)


def extract_prefix(source, stream, file_map, budget_sec=0, workers=6):
    """Извлекает фото из потока tar.gz (файл или stdin), конвертирует пулом потоков,
    публикует товары в БД. Уже сделанные (state) пропускает без конвертации."""
    state_path = os.path.join(STATE_DIR, f'state-{source}.json')
    state = {}
    if os.path.exists(state_path):
        with open(state_path) as f:
            state = json.load(f)
    print(f'[port] state: {len(state)} товаров уже сделаны', flush=True)

    src_dir = 'mytheresa' if source == 'my' else 'polyvore'
    web_dir = 'my' if source == 'my' else 'pv'
    out_sub = os.path.join(OUT_DIR, web_dir)
    os.makedirs(out_sub, exist_ok=True)

    db = sqlite3.connect(DB_PATH, timeout=30)
    cur = db.cursor()
    done_files, done_slugs, errors, committed = 0, 0, 0, 0
    pending = {}      # slug -> [webp url]
    futures = {}      # Future -> (slug, rel url)
    inflight = Counter()   # slug -> сколько фото в конвертации
    max_imgs = MAX_IMAGES_PER_ITEM[source]
    skipped = 0

    pool = ThreadPoolExecutor(max_workers=workers)

    def drain():
        nonlocal done_files, errors, committed
        for fut in [f for f in list(futures) if f.done()]:
            slug, rel = futures.pop(fut)
            inflight[slug] -= 1
            if inflight[slug] <= 0:
                inflight.pop(slug, None)
            try:
                fut.result()
            except Exception:
                errors += 1
                continue
            pending.setdefault(slug, []).append(rel)
            done_files += 1
            committed += 1

    def flush(force=False):
        nonlocal committed, pending, done_slugs
        if not pending:
            return
        if not force and committed < COMMIT_EVERY:
            return
        for slug, imgs in pending.items():
            row = cur.execute('SELECT images FROM Product WHERE slug = ?', (slug,)).fetchone()
            merged = []
            if row and row[0]:
                try:
                    merged = json.loads(row[0])
                except Exception:
                    merged = []
            for p in imgs:
                if p not in merged:
                    merged.append(p)
            cur.execute('UPDATE Product SET images = ?, published = 1, updatedAt = ? WHERE slug = ?',
                        (json.dumps(merged), time.strftime('%Y-%m-%d %H:%M:%S'), slug))
            state[slug] = merged
        db.commit()
        done_slugs += len(pending)
        committed = 0
        pending = {}
        with open(state_path, 'w') as f:
            json.dump(state, f)
        print(f'[port] закоммичено товаров: {done_slugs} (фото: {done_files}, ошибок: {errors})', flush=True)

    t0 = time.time()
    gz = gzip.GzipFile(fileobj=stream)
    tf = tarfile.open(fileobj=gz, mode='r|')
    entries = 0
    try:
        while True:
            try:
                entry = tf.next()
            except (tarfile.StreamError, EOFError, OSError, zlib.error):
                print('[port] конец доступного потока', flush=True)
                break
            if entry is None:
                break
            if not entry.isfile() or not entry.name.endswith('.jpg'):
                continue
            fname = os.path.basename(entry.name)
            if fname not in file_map:
                continue
            slug = file_map[fname][0]
            have = len(state.get(slug, [])) + len(pending.get(slug, [])) + inflight.get(slug, 0)
            if have >= max_imgs:
                skipped += 1
                continue
            if budget_sec and (time.time() - t0) > budget_sec:
                print('[port] бюджет времени исчерпан — плавное завершение', flush=True)
                break
            try:
                f = tf.extractfile(entry)
                raw = f.read()
            except (EOFError, OSError, zlib.error):
                print('[port] обрыв при чтении фото', flush=True)
                break
            idx = file_map[fname][1].index(fname) + 1
            base = f'{slug}-{idx}'
            fut = pool.submit(convert_to_webp, raw, os.path.join(out_sub, base + '.webp'))
            futures[fut] = (slug, f'/products/g2l/{web_dir}/{base}.webp')
            inflight[slug] += 1
            entries += 1
            if entries % 100 == 0:
                drain()
                if committed >= COMMIT_EVERY:
                    flush()
    finally:
        for fut in list(futures):
            try:
                fut.result(timeout=180)
            except Exception:
                errors += 1
        futures.clear()
        inflight.clear()
        flush(force=True)
        pool.shutdown(wait=False)
    db.close()
    with open(state_path, 'w') as f:
        json.dump(state, f)
    print(f'[port] раунд завершён: +{done_slugs} товаров с фото, {done_files} фото, ошибок: {errors}, '
          f'пропущено готовых: {skipped}, время: {time.time()-t0:.0f}s', flush=True)
    return done_slugs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', choices=['my', 'pv'], required=True)
    ap.add_argument('--shard', type=int, default=0, help='номер шарда images-NNNNN')
    ap.add_argument('--download-sec', type=int, default=0)
    ap.add_argument('--cap-gb', type=float, default=2.2)
    ap.add_argument('--skip-download', action='store_true')
    ap.add_argument('--stdin', action='store_true', help='читать tar.gz из stdin (curl | скрипт)')
    ap.add_argument('--budget-sec', type=int, default=0, help='макс. секунд извлечения (0 = без лимита)')
    ap.add_argument('--workers', type=int, default=6)
    args = ap.parse_args()

    if args.stdin:
        print('[port] режим ПОТОКА: tar.gz из stdin', flush=True)
        file_map = load_items_meta(args.source)
        print(f'[port] известных фото-файлов: {len(file_map)}', flush=True)
        n = extract_prefix(args.source, sys.stdin.buffer, file_map,
                           budget_sec=args.budget_sec, workers=args.workers)
        print(f'[port] раунд завершён: +{n} товаров с фото', flush=True)
        return

    os.makedirs(SHARD_DIR, exist_ok=True)
    shard_path = None
    if not args.skip_download and args.download_sec > 0:
        shard_path = download_round(args.source, args.download_sec, int(args.cap_gb * 1e9), args.shard)
    else:
        src_dir = 'mytheresa' if args.source == 'my' else 'polyvore'
        p = os.path.join(SHARD_DIR, f'{src_dir}-{args.shard:05d}.tar.gz')
        if os.path.exists(p):
            shard_path = p

    if not shard_path or not os.path.exists(shard_path):
        print('[port] нет частичного файла шарда — сначала раунд с --download-sec или curl | ... --stdin')
        sys.exit(1)

    print(f'[port] загрузка метаданных ({args.source})…', flush=True)
    file_map = load_items_meta(args.source)
    print(f'[port] известных фото-файлов: {len(file_map)}', flush=True)
    with open(shard_path, 'rb') as f:
        n = extract_prefix(args.source, f, file_map,
                           budget_sec=args.budget_sec, workers=args.workers)
    print(f'[port] раунд завершён: +{n} товаров с фото', flush=True)


if __name__ == '__main__':
    main()
