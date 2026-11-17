// Пошаговая брендификация каталога (стабильно под фронтальными запусками):
//   bun scripts/brandify-step.mjs status          — статистика
//   bun scripts/brandify-step.mjs vlm 800         — до N VLM-вердиктов (PERSON/CLEAN)
//   bun scripts/brandify-step.mjs compose 190     — до N композитов (вырезание + подложка)
//   bun scripts/brandify-step.mjs db              — финальная запись в БД
// Каждый запуск сам ограничивает себя по времени (MAX_SECONDS=470) и resume-безопасен.
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { removeBackground } from '@imgly/background-removal-node'

const ROOT = process.cwd()
const SRC_DIR = path.join(ROOT, 'data', 'sources')
const OUT_DIR = path.join(ROOT, 'public', 'products', 'catalog')
const BG_PATH = path.join(ROOT, 'scripts', 'assets', 'bg-template.png')
const PLAN_PATH = path.join(ROOT, 'data', 'import-plan.json')
const VLM_CACHE = path.join(ROOT, 'data', 'vlm-verdicts.json')

const IMAGES_PER_PRODUCT = 2
const CANVAS = 800
const BOTTOM_Y = 620
const TARGET_H = 400
const MAX_W = 600
const TIME_LIMIT = Number(process.env.MAX_SECONDS || 470) * 1000

const VLM_PROMPT = `You are filtering fashion e-commerce product photos. Look at ALL provided photos of ONE product.
Decide if ANY photo shows a human being or real human body parts: a model wearing the item, a face, head, hair, hands, arms, legs, FEET (even feet wearing shoes/sandals/anklets), neck, torso skin, or a partial human silhouette.
Note: empty ghost-mannequin shots and plain product-only shots are CLEAN. Plastic/jewelry display busts without human skin are CLEAN.
Answer with exactly one word: PERSON or CLEAN.`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Не даём неожиданным отказам API рушить процесс
process.on('unhandledRejection', (error) => {
  console.log('[step] отклонение промиса:', String(error).slice(0, 120))
})
process.on('uncaughtException', (error) => {
  console.log('[step] непойманное исключение:', String(error).slice(0, 120))
})
const sourcePath = (slug, index) => path.join(SRC_DIR, `${slug}-${index + 1}.webp`)
const outPath = (slug, index) => path.join(OUT_DIR, `${slug}-${index + 1}.webp`)

const loadPlan = () => {
  const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf-8'))
  return plan.products.filter((item) => item.images.length > 0)
}
const loadVerdicts = () => {
  // Приоритет: VLM-вердикты (строки), затем локальный YOLO ({verdict, score})
  const vlm = fs.existsSync(VLM_CACHE) ? JSON.parse(fs.readFileSync(VLM_CACHE, 'utf-8')) : {}
  const yoloPath = path.join(ROOT, 'data', 'person-verdicts.json')
  const yolo = fs.existsSync(yoloPath) ? JSON.parse(fs.readFileSync(yoloPath, 'utf-8')) : {}
  const merged = {}
  for (const [slug, value] of Object.entries(yolo)) {
    merged[slug] = typeof value === 'string' ? value : value.verdict
  }
  for (const [slug, value] of Object.entries(vlm)) {
    merged[slug] = typeof value === 'string' ? value : value.verdict
  }
  return merged
}
const saveVerdicts = (verdicts) => fs.writeFileSync(VLM_CACHE, JSON.stringify(verdicts))

// ---------- status ----------
const status = () => {
  const products = loadPlan()
  const verdicts = loadVerdicts()
  const withSources = products.filter((p) => fs.existsSync(sourcePath(p.slug, 0)) || fs.existsSync(sourcePath(p.slug, 1)))
  const clean = products.filter((p) => verdicts[p.slug] === 'CLEAN')
  const person = products.filter((p) => verdicts[p.slug] === 'PERSON')
  let composited = 0
  for (const p of clean) {
    if (fs.existsSync(outPath(p.slug, 0)) || fs.existsSync(outPath(p.slug, 1))) composited += 1
  }
  console.log(`товаров в плане: ${products.length}; с исходниками: ${withSources.length}; вердиктов: ${Object.keys(verdicts).length} (CLEAN ${clean.length}, PERSON ${person.length}); хотя бы один композит: ${composited}`)
}

// ---------- vlm ----------
const runVlm = async (limit) => {
  const products = loadPlan()
  const verdicts = loadVerdicts()
  const pending = products.filter((p) => {
    if (verdicts[p.slug]) return false
    return fs.existsSync(sourcePath(p.slug, 0)) || fs.existsSync(sourcePath(p.slug, 1))
  })
  console.log(`[vlm] к проверке: ${pending.length}, лимит запуска ${limit}`)
  const queue = pending.slice(0, limit)
  const zai = (await import('z-ai-web-dev-sdk')).default
  const zaiClient = await zai.create()
  let processed = 0
  let persons = 0
  const started = Date.now()

  // API не терпит параллельные запросы (429) — работает ровно один воркер
  const workers = Array.from({ length: 1 }, async () => {
    try {
      while (queue.length > 0 && Date.now() - started < TIME_LIMIT) {
        const product = queue.shift()
        if (!product) break
        const content = [{ type: 'text', text: VLM_PROMPT }]
      for (let i = 0; i < product.images.length; i += 1) {
        const file = sourcePath(product.slug, i)
        if (!fs.existsSync(file)) continue
        const small = await sharp(file).resize(384).webp({ quality: 70 }).toBuffer()
        content.push({ type: 'image_url', image_url: { url: `data:image/webp;base64,${small.toString('base64')}` } })
      }
      for (let attempt = 1; attempt <= 6; attempt += 1) {
        try {
          const res = await zaiClient.chat.completions.createVision({
            messages: [{ role: 'user', content }],
            thinking: { type: 'disabled' },
          })
          const raw = (res.choices[0]?.message?.content || '').toUpperCase()
          if (raw.length > 0) {
            const answer = raw.includes('PERSON') ? 'PERSON' : 'CLEAN'
            verdicts[product.slug] = answer
            if (answer === 'PERSON') persons += 1
            processed += 1
            break
          }
        } catch {
          await sleep(9000 * attempt)
        }
      }
      if (processed % 50 === 0) {
        saveVerdicts(verdicts)
        console.log(`[vlm] ${processed}/${queue.length + processed} • PERSON: ${persons}`)
      }
      }
    } catch (error) {
      console.log('[vlm] воркер упал:', String(error).slice(0, 140))
    }
  })
  await Promise.all(workers)
  saveVerdicts(verdicts)
  const totalPerson = Object.values(verdicts).filter((v) => v === 'PERSON').length
  console.log(`[vlm] готово: проверено в этом запуске ${processed}, PERSON ${persons}; всего вердиктов ${Object.keys(verdicts).length} (PERSON ${totalPerson})`)
}

// ---------- compose ----------
const composeOne = async (srcFile, destFile, bgBuffer) => {
  const input = await sharp(srcFile).resize(512).webp().toBuffer()
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
  // Валидация результата: повреждённый файл сразу удаляем
  const check = await sharp(destFile).metadata()
  if (!check.width) throw new Error('битый вывод')
}

const runCompose = async (limit) => {
  const products = loadPlan()
  const verdicts = loadVerdicts()
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const bgBuffer = await sharp(BG_PATH).resize(CANVAS, CANVAS).toBuffer()
  const tasks = []
  for (const product of products) {
    if (verdicts[product.slug] !== 'CLEAN') continue
    for (let i = 0; i < Math.min(product.images.length, IMAGES_PER_PRODUCT); i += 1) {
      if (fs.existsSync(sourcePath(product.slug, i)) && !fs.existsSync(outPath(product.slug, i))) {
        tasks.push({ product, index: i })
      }
    }
  }
  console.log(`[compose] всего задач: ${tasks.length}, в этом запуске: ${Math.min(tasks.length, limit)}`)
  const queue = tasks.slice(0, limit)
  const totalTasks = queue.length
  let done = 0
  let failed = 0
  const started = Date.now()

  const workers = Array.from({ length: 2 }, async () => {
    try {
      while (queue.length > 0 && Date.now() - started < TIME_LIMIT) {
        const task = queue.shift()
        if (!task) break
        try {
          const dest = outPath(task.product.slug, task.index)
          if (fs.existsSync(dest)) continue // уже собран — не пересобираем
          await composeOne(sourcePath(task.product.slug, task.index), dest, bgBuffer)
          done += 1
        } catch (error) {
          failed += 1
          try { fs.unlinkSync(outPath(task.product.slug, task.index)) } catch {}
          if (failed % 20 === 0) console.log(`[compose] ошибка: ${task.product.slug}-${task.index + 1}: ${error.message}`)
        }
        if (done % 40 === 0 && done > 0) console.log(`[compose] ${done}/${totalTasks} (ошибок ${failed})`)
      }
    } catch (error) {
      console.log('[compose] воркер упал:', String(error).slice(0, 140))
    }
  })
  await Promise.all(workers)
  console.log(`[compose] готово: собрано ${done}, ошибок ${failed}`)
}

// ---------- db ----------
const runDb = async () => {
  const { db } = await import('./src/lib/db.js')
  const { slugify } = await import('./src/lib/constants.js')
  const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf-8'))
  const products = loadPlan()
  const verdicts = loadVerdicts()

  const hidden = await db.product.updateMany({
    where: { decor: false, NOT: { images: { contains: '/products/catalog/' } } },
    data: { published: false },
  })
  console.log(`[db] старых товаров скрыто: ${hidden.count}`)

  const categories = await db.category.findMany()
  const categoryIdBySlug = new Map(categories.map((item) => [item.slug, item.id]))
  const subcategoryIdByKey = new Map()
  for (const sub of plan.subcategories) {
    const categoryId = categoryIdBySlug.get(sub.categorySlug)
    if (!categoryId) continue
    const slug = `${sub.categorySlug}-${slugify(sub.name)}`
    const row = await db.subcategory.upsert({
      where: { slug },
      create: { slug, name: sub.name, sort: sub.sort, categoryId },
      update: { name: sub.name, sort: sub.sort, categoryId },
    })
    subcategoryIdByKey.set(`${sub.categorySlug}/${sub.name}`, row.id)
  }
  console.log(`[db] подкатегорий: ${subcategoryIdByKey.size}`)

  const personSlugs = Object.entries(verdicts).filter(([, v]) => v === 'PERSON').map(([slug]) => slug)
  if (personSlugs.length > 0) {
    const deleted = await db.product.deleteMany({ where: { slug: { in: personSlugs } } })
    console.log(`[db] товаров с человеком удалено: ${deleted.count}`)
  }

  let created = 0
  let noImages = 0
  for (const product of products) {
    if (verdicts[product.slug] !== 'CLEAN') continue
    const localImages = []
    for (let i = 0; i < IMAGES_PER_PRODUCT; i += 1) {
      const file = outPath(product.slug, i)
      if (fs.existsSync(file)) {
        // пропускаем повреждённые выходные файлы
        try {
          const meta = await sharp(file).metadata()
          if (meta.width) localImages.push(`/products/catalog/${product.slug}-${i + 1}.webp`)
        } catch {}
      }
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
    if (created % 300 === 0) console.log(`[db] записано ${created}`)
  }
  const total = await db.product.count()
  const published = await db.product.count({ where: { published: true } })
  console.log(`[db] ГОТОВО: записано ${created}, без композита пропущено ${noImages}; всего в БД ${total}, опубликовано ${published}`)
  await db.$disconnect()
}

const main = async () => {
  const mode = process.argv[2]
  const limit = Number(process.argv[3] || 200)
  const started = Date.now()
  if (mode === 'status') status()
  else if (mode === 'vlm') await runVlm(limit)
  else if (mode === 'compose') await runCompose(limit)
  else if (mode === 'db') await runDb()
  else console.log('режимы: status | vlm N | compose N | db')
  console.log(`[step] время: ${((Date.now() - started) / 1000).toFixed(0)}с`)
}

try {
  await main()
} catch (error) {
  console.log(`[step] главная ошибка (продолжаем): ${String(error).slice(0, 200)}`)
}

