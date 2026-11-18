// Полный импорт каталога 13 STYLES: ВСЕ товары датасета БЕЗ ФИЛЬТРАЦИИ.
// Скачивает оригинальные фото с Shopify CDN (?width=640), конвертирует в .webp
// (фон НЕ трогаем — картинки в оригинальном виде) и сразу upsert-ит товар в БД.
// Возобновляемый: прогресс в data/import-progress.json, готовые файлы не перекачиваются.
// Запуск: node scripts/fetch-catalog-images.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PLAN_PATH = path.join(ROOT, 'data', 'import-plan.json')
const PROGRESS_PATH = path.join(ROOT, 'data', 'import-progress.json')
const MANIFEST_PATH = path.join(ROOT, 'data', 'catalog-manifest.json')
const OUT_DIR = path.join(ROOT, 'public', 'products', 'catalog')
const LOG_PATH = path.join(ROOT, 'data', 'fetch.log')

const MAX_IMAGES = 2        // фото на товар (основное + деталь)
const MAX_SIDE = 640        // максимальная сторона (без апскейла)
const WEBP_Q = 62
const WORKERS = 5           // экономно по памяти: среда ограничена 4 ГБ
const DL_TIMEOUT = 15000
const DL_RETRIES = 2

const db = new PrismaClient()

const log = (msg) => {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${msg}`
  console.log(line)
  try { fs.appendFileSync(LOG_PATH, line + '\n') } catch {}
}

// --- повтор при SQLITE_BUSY / таймаутах ---
const withDbRetry = async (fn, attempts = 4) => {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const busy = /SQLITE_BUSY|Timed out|P2024|Resource|busy/i.test(String(error?.message || error))
      if (!busy) throw error
      await new Promise((r) => setTimeout(r, 400 * (i + 1)))
    }
  }
  throw lastError
}

// --- скачивание ---
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/jpeg,image/*,*/*;q=0.8',
}

const cdnUrl = (url) => {
  const base = String(url || '').split('?')[0]
  return `${base}?width=${MAX_SIDE}`
}

const fetchImage = async (url) => {
  for (let attempt = 0; attempt <= DL_RETRIES; attempt += 1) {
    try {
      const response = await fetch(cdnUrl(url), { headers: HEADERS, signal: AbortSignal.timeout(DL_TIMEOUT) })
      if (response.status === 404 || response.status === 403) return null
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer())
        if (buffer.length > 500) return buffer
      }
    } catch {
      // повтор после паузы
    }
    await new Promise((r) => setTimeout(r, 700 * (attempt + 1)))
  }
  return null
}

const toWebp = (buffer) =>
  sharp(buffer)
    .rotate()
    .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_Q, effort: 3 })
    .toBuffer()

// --- главный проход ---
let stopping = false
const onSignal = () => {
  if (stopping) process.exit(1)
  stopping = true
  log('получен сигнал остановки — завершаем текущие товары и сохраняем прогресс...')
}
process.on('SIGINT', onSignal)
process.on('SIGTERM', onSignal)

const loadProgress = () => {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

const saveProgress = (progress) => {
  try { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress)) } catch {}
}

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf-8'))
  const products = plan.products || []
  const progress = loadProgress()
  log(`план: ${products.length} товаров • в прогрессе: ${Object.keys(progress).length}`)

  // 1) Категории и подкатегории
  const categories = await db.category.findMany()
  const catBySlug = new Map(categories.map((c) => [c.slug, c.id]))
  for (const sub of plan.subcategories || []) {
    const categoryId = catBySlug.get(sub.categorySlug)
    if (!categoryId) continue
    const slug = `${sub.categorySlug}-${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`
    await withDbRetry(() => db.subcategory.upsert({
      where: { slug },
      update: { name: sub.name, sort: sub.sort, categoryId },
      create: { slug, name: sub.name, sort: sub.sort, categoryId },
    }))
  }
  const subcategories = await db.subcategory.findMany()
  const subByKey = new Map(subcategories.map((s) => [`${s.categoryId}|${s.name}`, s.id]))
  log(`категорий: ${categories.length} • подкатегорий: ${subcategories.length}`)

  // 2) Скрываем старые обычные товары (decor остаётся) и прошлый фильтрованный каталог
  const hidden = await withDbRetry(() => db.product.updateMany({
    where: {
      decor: false,
      OR: [
        { images: { not: { contains: '/products/catalog/' } } },
        { images: '' },
      ],
    },
    data: { published: false },
  }))
  log(`скрыто старых товаров: ${hidden.count}`)

  // 3) Пул воркеров: скачиваем фото и сразу upsert-им товар
  const urlCache = new Map() // url -> относительный путь уже сохранённого файла
  let done = 0
  let failed = 0
  let cursor = 0

  const upsertProduct = async (item, images) => {
    const categoryId = catBySlug.get(item.categorySlug)
    if (!categoryId) return false
    const subcategoryId = subByKey.get(`${categoryId}|${item.subcategoryName}`) || null
    const data = {
      name: item.name,
      shortDesc: item.shortDesc,
      description: item.description,
      price: item.price,
      oldPrice: item.oldPrice,
      gender: item.gender,
      sizes: JSON.stringify(item.sizes || []),
      colors: JSON.stringify(item.colors || []),
      images: JSON.stringify(images),
      label: item.label,
      stock: item.stock,
      rating: item.rating,
      reviews: item.reviews,
      featured: item.featured,
      published: true,
      decor: false,
      categoryId,
      subcategoryId,
      createdAt: new Date(item.createdAt),
    }
    await withDbRetry(() => db.product.upsert({
      where: { slug: item.slug },
      update: data,
      create: { slug: item.slug, ...data },
    }))
    return true
  }

  const processProduct = async (item) => {
    if (stopping) return
    const urls = (item.images || []).slice(0, MAX_IMAGES)
    const images = []
    try {
      for (let n = 0; n < urls.length; n += 1) {
        const url = urls[n]
        const fileName = `${item.slug}-${n + 1}.webp`
        const filePath = path.join(OUT_DIR, fileName)
        const rel = `/products/catalog/${fileName}`

        if (urlCache.has(url)) {
          images.push(urlCache.get(url))
          continue
        }
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 500) {
          // файл уже на диске с прошлого запуска — не перекачиваем
          images.push(rel)
          urlCache.set(url, rel)
          continue
        }
        const raw = await fetchImage(url)
        if (!raw) continue
        const webp = await toWebp(raw)
        fs.writeFileSync(filePath, webp)
        images.push(rel)
        urlCache.set(url, rel)
      }

      const ok = await upsertProduct(item, images)
      if (!ok) {
        failed += 1
        return
      }
      progress[item.slug] = true
      done += 1
      if (done % 25 === 0) {
        log(`${done}/${products.length} • ошибок: ${failed}`)
      }
      if (done % 50 === 0) saveProgress(progress)
    } catch (error) {
      failed += 1
      log(`ОШИБКА ${item.slug}: ${error?.message || error}`)
    }
  }

  const worker = async () => {
    while (!stopping) {
      const index = cursor
      cursor += 1
      if (index >= products.length) return
      await processProduct(products[index])
    }
  }

  await Promise.all(Array.from({ length: WORKERS }, () => worker()))
  saveProgress(progress)

  // 4) Удаляем устаревшие каталожные товары, которых нет в плане
  const planSlugs = new Set(products.map((p) => p.slug))
  const stale = await db.product.findMany({
    where: { images: { contains: '/products/catalog/' } },
    select: { id: true, slug: true },
  })
  let deleted = 0
  for (const row of stale) {
    if (!planSlugs.has(row.slug)) {
      await withDbRetry(() => db.product.delete({ where: { id: row.id } }))
      deleted += 1
    }
  }
  log(`удалено устаревших: ${deleted}`)

  // 5) Манифест для restore/dump
  const manifest = products
    .filter((p) => progress[p.slug])
    .map((p) => {
      const images = []
      for (let n = 1; n <= MAX_IMAGES; n += 1) {
        const rel = `/products/catalog/${p.slug}-${n}.webp`
        if (fs.existsSync(path.join(ROOT, 'public', rel))) images.push(rel)
      }
      return { slug: p.slug, images }
    })
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    total: manifest.length,
    products: manifest,
  }))

  const published = await db.product.count({ where: { published: true, decor: false } })
  log(`ГОТОВО: товаров импортировано ${done} • ошибок ${failed} • удалено устаревших ${deleted} • published в каталоге: ${published}`)
  await db.$disconnect()
}

main().catch(async (error) => {
  log(`ФАТАЛЬНО: ${error?.stack || error?.message || error}`)
  try { await db.$disconnect() } catch {}
  process.exit(1)
})
