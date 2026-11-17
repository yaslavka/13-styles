// Полный пайплайн фирменного каталога 13 STYLES из датасета Livostyle:
//   СТАДИЯ A: скачивание исходных фото в data/sources (webp 640)
//   СТАДИЯ B: VLM-фильтр — товары с человеком/частями тела полностью исключаются
//   СТАДИЯ C: вырезание товара (@imgly) + композитинг на фирменную подложку
//             (фиолетовый градиент + оранжевая подставка) -> webp 800x800
//   СТАДИЯ D: запись в БД (CLEAN -> published, PERSON -> удалены)
// Запуск: bun scripts/brandify-catalog.js
// Всё resume-безопасно: кэш вердиктов data/vlm-verdicts.json, готовые файлы пропускаются.

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { removeBackground } from '@imgly/background-removal-node'
import ZAI from 'z-ai-web-dev-sdk'
import { fileURLToPath } from 'url'
import { db } from '../src/lib/db.js'
import { slugify } from '../src/lib/constants.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PLAN_PATH = path.join(ROOT, 'data', 'import-plan.json')
const SRC_DIR = path.join(ROOT, 'data', 'sources')
const OUT_DIR = path.join(ROOT, 'public', 'products', 'catalog')
const BG_PATH = path.join(__dirname, 'assets', 'bg-template.png')
const VLM_CACHE = path.join(ROOT, 'data', 'vlm-verdicts.json')

const IMAGES_PER_PRODUCT = 2
const DOWNLOAD_WORKERS = 12
const VLM_WORKERS = 3
const CUTOUT_WORKERS = 2
const CANVAS = 800
const BOTTOM_Y = 620
const TARGET_H = 400
const MAX_W = 600

const VLM_PROMPT = `You are filtering fashion e-commerce product photos. Look at ALL provided photos of ONE product.
Decide if ANY photo shows a human being or real human body parts: a model wearing the item, a face, head, hair, hands, arms, legs, FEET (even feet wearing shoes/sandals/anklets), neck, torso skin, or a partial human silhouette.
Note: empty ghost-mannequin shots and plain product-only shots are CLEAN. Plastic/jewelry display busts without human skin are CLEAN.
Answer with exactly one word: PERSON or CLEAN.`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const sourcePath = (slug, index) => path.join(SRC_DIR, `${slug}-${index + 1}.webp`)
const outPath = (slug, index) => path.join(OUT_DIR, `${slug}-${index + 1}.webp`)

// ---------- СТАДИЯ A: скачивание исходников ----------
const downloadSource = async (url, dest) => {
  if (fs.existsSync(dest)) return true
  const target = `${url}${url.includes('?') ? '&' : '?'}width=640`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; 13styles-brandify)' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    await sharp(buffer).rotate().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dest)
    return true
  } finally {
    clearTimeout(timer)
  }
}

const stageDownload = async (products) => {
  console.log('[A] скачивание исходных фото...')
  fs.mkdirSync(SRC_DIR, { recursive: true })
  const tasks = []
  for (const product of products) {
    for (let i = 0; i < Math.min(product.images.length, IMAGES_PER_PRODUCT); i += 1) {
      tasks.push({ product, index: i })
    }
  }
  let done = 0
  let failed = 0
  const queue = [...tasks]
  const workers = Array.from({ length: DOWNLOAD_WORKERS }, async () => {
    while (queue.length > 0) {
      const { product, index } = queue.shift()
      const dest = sourcePath(product.slug, index)
      if (fs.existsSync(dest)) {
        done += 1
        continue
      }
      try {
        await downloadSource(product.images[index], dest)
        done += 1
      } catch {
        try {
          await sleep(1500)
          await downloadSource(product.images[index], dest)
          done += 1
        } catch {
          failed += 1
        }
      }
      if (done % 200 === 0) console.log(`[A] ${done}/${tasks.length} (ошибок ${failed})`)
    }
  })
  await Promise.all(workers)
  console.log(`[A] готово: ${done}/${tasks.length} (ошибок ${failed})`)
}

// ---------- СТАДИЯ B: VLM-фильтр людей ----------
const loadVerdicts = () => (fs.existsSync(VLM_CACHE) ? JSON.parse(fs.readFileSync(VLM_CACHE, 'utf-8')) : {})
const saveVerdicts = (verdicts) => fs.writeFileSync(VLM_CACHE, JSON.stringify(verdicts))

const stageVLM = async (products, zai) => {
  console.log('[B] VLM-фильтр людей...')
  const verdicts = loadVerdicts()
  const pending = products.filter((p) => {
    if (verdicts[p.slug]) return false
    return p.images.some((_, i) => fs.existsSync(sourcePath(p.slug, i)))
  })
  console.log(`[B] новых товаров на проверку: ${pending.length} (в кэше ${Object.keys(verdicts).length})`)
  let processed = 0
  const queue = [...pending]
  const workers = Array.from({ length: VLM_WORKERS }, async () => {
    while (queue.length > 0) {
      const product = queue.shift()
      const content = [{ type: 'text', text: VLM_PROMPT }]
      for (let i = 0; i < product.images.length; i += 1) {
        const file = sourcePath(product.slug, i)
        if (!fs.existsSync(file)) continue
        const small = await sharp(file).resize(384).webp({ quality: 70 }).toBuffer()
        content.push({ type: 'image_url', image_url: { url: `data:image/webp;base64,${small.toString('base64')}` } })
      }
      let answer = 'FAIL'
      for (let attempt = 1; attempt <= 5; attempt += 1) {
        try {
          const res = await zai.chat.completions.createVision({
            messages: [{ role: 'user', content }],
            thinking: { type: 'disabled' },
          })
          const raw = (res.choices[0]?.message?.content || '').toUpperCase()
          if (raw.length > 0) {
            answer = raw.includes('PERSON') ? 'PERSON' : 'CLEAN'
            break
          }
        } catch {
          await sleep(2500 * attempt)
        }
      }
      if (answer !== 'FAIL') verdicts[product.slug] = answer
      processed += 1
      if (processed % 50 === 0) {
        saveVerdicts(verdicts)
        const persons = Object.values(verdicts).filter((v) => v === 'PERSON').length
        console.log(`[B] ${processed}/${pending.length} • PERSON: ${persons}`)
      }
    }
  })
  await Promise.all(workers)
  saveVerdicts(verdicts)
  const persons = Object.values(verdicts).filter((v) => v === 'PERSON').length
  console.log(`[B] готово: CLEAN ${Object.keys(verdicts).length - persons}, PERSON ${persons}`)
  return verdicts
}

// ---------- СТАДИЯ C: вырезание + композитинг ----------
const composeProductImage = async (sourceFile, destFile, bgBuffer) => {
  const input = await sharp(sourceFile).resize(512).webp().toBuffer()
  const blob = new Blob([input], { type: 'image/webp' })
  const result = await removeBackground(blob, { model: 'small', output: { quality: 0.9, format: 'image/png' } })
  const cutout = Buffer.from(await result.arrayBuffer())
  const trimmed = await sharp(cutout).trim({ threshold: 12 }).png().toBuffer()
  const meta = await sharp(trimmed).metadata()
  if (meta.width < 30 || meta.height < 30) throw new Error('пустая вырезка')
  const scale = Math.min(TARGET_H / meta.height, MAX_W / meta.width, 1.4)
  const w = Math.round(meta.width * scale)
  const h = Math.round(meta.height * scale)
  const resized = await sharp(trimmed).resize(w, h).png().toBuffer()
  const shadowSvg = Buffer.from(
    `<svg width="${CANVAS}" height="${CANVAS}"><filter id="b"><feGaussianBlur stdDeviation="14"/></filter><ellipse cx="${CANVAS / 2}" cy="${BOTTOM_Y + 2}" rx="${Math.round(w * 0.36)}" ry="${Math.round(h * 0.045 + 8)}" fill="rgba(30,10,50,0.42)" filter="url(#b)"/></svg>`,
  )
  const shadow = await sharp(shadowSvg).png().toBuffer()
  await sharp(bgBuffer)
    .composite([
      { input: shadow, left: 0, top: 0 },
      { input: resized, left: Math.round(CANVAS / 2 - w / 2), top: Math.round(BOTTOM_Y - h) },
    ])
    .webp({ quality: 74 })
    .toFile(destFile)
}

const stageComposite = async (products, verdicts) => {
  console.log('[C] вырезание и композитинг на фирменную подложку...')
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const bgBuffer = await sharp(BG_PATH).resize(CANVAS, CANVAS).toBuffer()
  const clean = products.filter((p) => verdicts[p.slug] === 'CLEAN' && p.images.some((_, i) => fs.existsSync(sourcePath(p.slug, i))))
  console.log(`[C] CLEAN-товаров на обработку: ${clean.length}`)
  const tasks = []
  for (const product of clean) {
    for (let i = 0; i < Math.min(product.images.length, IMAGES_PER_PRODUCT); i += 1) {
      const src = sourcePath(product.slug, i)
      if (fs.existsSync(src)) tasks.push({ product, index: i })
    }
  }
  let done = 0
  let failed = 0
  const queue = [...tasks]
  const workers = Array.from({ length: CUTOUT_WORKERS }, async () => {
    while (queue.length > 0) {
      const { product, index } = queue.shift()
      try {
        await composeProductImage(sourcePath(product.slug, index), outPath(product.slug, index), bgBuffer)
        done += 1
      } catch (error) {
        failed += 1
        if (failed % 25 === 0) console.log(`[C] ошибка: ${product.slug}-${index + 1}: ${error.message}`)
      }
      if (done % 100 === 0 && done > 0) console.log(`[C] ${done}/${tasks.length} (ошибок ${failed})`)
    }
  })
  await Promise.all(workers)
  console.log(`[C] готово: ${done}/${tasks.length} (ошибок ${failed})`)
  return clean
}

// ---------- СТАДИЯ D: запись в БД ----------
const stageDatabase = async (products, verdicts) => {
  console.log('[D] запись в БД...')
  const hidden = await db.product.updateMany({
    where: { decor: false, NOT: { images: { startsWith: '/products/catalog/' } } },
    data: { published: false },
  })
  console.log(`[D] старых товаров скрыто: ${hidden.count}`)

  const categories = await db.category.findMany()
  const categoryIdBySlug = new Map(categories.map((item) => [item.slug, item.id]))
  const subcategoryIdByKey = new Map()
  const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf-8'))
  for (const sub of plan.subcategories) {
    const categoryId = categoryIdBySlug.get(sub.categorySlug)
    const slug = `${sub.categorySlug}-${slugify(sub.name)}`
    const row = await db.subcategory.upsert({
      where: { slug },
      create: { slug, name: sub.name, sort: sub.sort, categoryId },
      update: { name: sub.name, sort: sub.sort, categoryId },
    })
    subcategoryIdByKey.set(`${sub.categorySlug}/${sub.name}`, row.id)
  }

  const personSlugs = Object.entries(verdicts).filter(([, v]) => v === 'PERSON').map(([slug]) => slug)
  if (personSlugs.length > 0) {
    const deleted = await db.product.deleteMany({ where: { slug: { in: personSlugs } } })
    console.log(`[D] товаров с человеком удалено из БД: ${deleted.count}`)
  }

  const cleanSlugs = new Set(products.filter((p) => verdicts[p.slug] === 'CLEAN').map((p) => p.slug))
  let created = 0
  let noImages = 0
  for (const product of products) {
    if (!cleanSlugs.has(product.slug)) continue
    const localImages = []
    for (let i = 0; i < IMAGES_PER_PRODUCT; i += 1) {
      if (fs.existsSync(outPath(product.slug, i))) localImages.push(`/products/catalog/${product.slug}-${i + 1}.webp`)
    }
    if (localImages.length === 0) {
      noImages += 1
      continue
    }
    const categoryId = categoryIdBySlug.get(product.categorySlug)
    const subcategoryId = subcategoryIdByKey.get(`${product.categorySlug}/${product.subcategoryName}`) || null
    await db.product.upsert({
      where: { slug: product.slug },
      create: {
        slug: product.slug,
        name: product.name,
        shortDesc: product.shortDesc,
        description: product.description,
        price: product.price,
        oldPrice: product.oldPrice,
        gender: product.gender,
        sizes: JSON.stringify(product.sizes),
        colors: JSON.stringify(product.colors),
        images: JSON.stringify(localImages),
        label: product.label,
        stock: product.stock,
        rating: product.rating,
        reviews: product.reviews,
        featured: product.featured,
        published: true,
        decor: false,
        categoryId,
        subcategoryId,
        createdAt: new Date(product.createdAt),
      },
      update: {
        price: product.price,
        oldPrice: product.oldPrice,
        sizes: JSON.stringify(product.sizes),
        colors: JSON.stringify(product.colors),
        label: product.label,
        stock: product.stock,
        rating: product.rating,
        reviews: product.reviews,
        featured: product.featured,
        published: true,
        decor: false,
        subcategoryId,
      },
    })
    created += 1
    if (created % 200 === 0) console.log(`[D] записано ${created}`)
  }
  const total = await db.product.count()
  const published = await db.product.count({ where: { published: true } })
  console.log(`[D] готово: записано ${created}, без фото пропущено ${noImages}; всего в БД ${total}, опубликовано ${published}`)
}

const main = async () => {
  const started = Date.now()
  const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf-8'))
  const products = plan.products.filter((item) => item.images.length > 0)
  console.log(`[brandify] старт: товаров в плане ${products.length}`)

  const zai = await ZAI.create()
  await stageDownload(products)
  const verdicts = await stageVLM(products, zai)
  await stageComposite(products, verdicts)
  await stageDatabase(products, verdicts)

  console.log(`[brandify] ГОТОВО за ${((Date.now() - started) / 60000).toFixed(1)} мин`)
}

main()
  .catch((error) => {
    console.error('[brandify] падение:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
