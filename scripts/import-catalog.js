// Импорт каталога Livostyle (HuggingFace) в БД 13 STYLES
// Запуск: bun scripts/import-catalog.js
// 1. Скрывает старые обычные товары (декор-товары остаются), публиковать не прекращая
// 2. Создаёт/обновляет подкатегории из data/import-plan.json
// 3. Скачивает фото локально в public/products/catalog (sharp -> webp 640px)
// 4. Создаёт товары: случайные цены/размеры уже в плане, даты — из датасета

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { db } from '../src/lib/db.js'
import { slugify } from '../src/lib/constants.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLAN_PATH = path.join(__dirname, '..', 'data', 'import-plan.json')
const IMG_DIR = path.join(__dirname, '..', 'public', 'products', 'catalog')

const WIDTH = 640
const QUALITY = 68
const CHUNK = 10 // товаров в параллельной загрузке фото (по 3 фото = 30 соединений)

let downloaded = 0
let bytesSaved = 0

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const downloadImage = async (url, dest) => {
  if (fs.existsSync(dest)) {
    downloaded += 1
    bytesSaved += fs.statSync(dest).size
    return true
  }
  const target = `${url}${url.includes('?') ? '&' : '?'}width=${WIDTH}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; 13styles-catalog-import)' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    await sharp(buffer)
      .rotate()
      .resize({ width: WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(dest)
    downloaded += 1
    bytesSaved += fs.statSync(dest).size
    return true
  } finally {
    clearTimeout(timer)
  }
}

const fetchProductImages = async (product) => {
  const local = []
  for (let index = 0; index < product.images.length; index += 1) {
    const dest = path.join(IMG_DIR, `${product.slug}-${index + 1}.webp`)
    try {
      await downloadImage(product.images[index], dest)
      local.push(`/products/catalog/${product.slug}-${index + 1}.webp`)
    } catch (error) {
      try {
        await sleep(1200)
        await downloadImage(product.images[index], dest)
        local.push(`/products/catalog/${product.slug}-${index + 1}.webp`)
      } catch {
        console.log(`[import] фото недоступно: ${product.slug} #${index + 1} (${error.message})`)
      }
    }
  }
  return local
}

const main = async () => {
  const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf-8'))
  fs.mkdirSync(IMG_DIR, { recursive: true })

  console.log(`[import] план: товаров ${plan.products.length}, подкатегорий ${plan.subcategories.length}`)

  // 1. Скрываем старые обычные товары (не декор и не из каталога Livostyle)
  const hidden = await db.product.updateMany({
    where: { decor: false, NOT: { images: { startsWith: '/products/catalog/' } } },
    data: { published: false },
  })
  console.log(`[import] старых товаров скрыто: ${hidden.count}`)

  // 2. Подкатегории из плана (slug = {категория}-{имя})
  const categories = await db.category.findMany()
  const categoryIdBySlug = new Map(categories.map((item) => [item.slug, item.id]))
  const subcategoryIdByKey = new Map()
  for (const sub of plan.subcategories) {
    const categoryId = categoryIdBySlug.get(sub.categorySlug)
    if (!categoryId) throw new Error(`Категория не найдена: ${sub.categorySlug}`)
    const slug = `${sub.categorySlug}-${slugify(sub.name)}`
    const row = await db.subcategory.upsert({
      where: { slug },
      create: { slug, name: sub.name, sort: sub.sort, categoryId },
      update: { name: sub.name, sort: sub.sort, categoryId },
    })
    subcategoryIdByKey.set(`${sub.categorySlug}/${sub.name}`, row.id)
  }
  console.log(`[import] подкатегории готовы: ${subcategoryIdByKey.size}`)

  // 3. Товары пачками: фото параллельно, записи в БД последовательно
  const products = plan.products.filter((item) => item.images.length > 0)
  const noImages = plan.products.length - products.length
  if (noImages > 0) console.log(`[import] пропущено без фото: ${noImages}`)

  let created = 0
  let failed = 0
  const startedAt = Date.now()

  for (let index = 0; index < products.length; index += CHUNK) {
    const chunk = products.slice(index, index + CHUNK)
    const imagesResults = await Promise.all(chunk.map((item) => fetchProductImages(item)))

    for (let i = 0; i < chunk.length; i += 1) {
      const item = chunk[i]
      const localImages = imagesResults[i]
      if (localImages.length === 0) {
        failed += 1
        continue
      }
      const categoryId = categoryIdBySlug.get(item.categorySlug)
      const subcategoryId = subcategoryIdByKey.get(`${item.categorySlug}/${item.subcategoryName}`) || null
      try {
        await db.product.upsert({
          where: { slug: item.slug },
          create: {
            slug: item.slug,
            name: item.name,
            shortDesc: item.shortDesc,
            description: item.description,
            price: item.price,
            oldPrice: item.oldPrice,
            gender: item.gender,
            sizes: JSON.stringify(item.sizes),
            colors: JSON.stringify(item.colors),
            images: JSON.stringify(localImages),
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
          },
          update: {
            price: item.price,
            oldPrice: item.oldPrice,
            sizes: JSON.stringify(item.sizes),
            colors: JSON.stringify(item.colors),
            label: item.label,
            stock: item.stock,
            rating: item.rating,
            reviews: item.reviews,
            featured: item.featured,
            published: true,
            subcategoryId,
          },
        })
        created += 1
      } catch (error) {
        failed += 1
        console.log(`[import] ошибка записи ${item.slug}: ${error.message}`)
      }
    }

    const done = Math.min(index + CHUNK, products.length)
    const minutes = ((Date.now() - startedAt) / 60000).toFixed(1)
    const mb = (bytesSaved / 1024 / 1024).toFixed(1)
    console.log(`[import] ${done}/${products.length} товаров • фото ${downloaded} (${mb} MB) • ${minutes} мин • ошибок ${failed}`)
  }

  const [total, publishedCount] = await Promise.all([db.product.count(), db.product.count({ where: { published: true } })])
  console.log(`[import] ГОТОВО: записано ${created}, ошибок ${failed}, всего в БД ${total}, опубликовано ${publishedCount}`)
}

main()
  .catch((error) => {
    console.error('[import] падение:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
