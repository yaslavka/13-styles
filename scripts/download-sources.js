// Стадия A отдельно: скачивание исходных фото в data/sources
// Запуск: bun scripts/download-sources.js  (resume-безопасно, пачки по 8, паузы для GC)
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'data', 'sources')
const IMAGES_PER_PRODUCT = 2
const CHUNK = 8

process.on('uncaughtException', (e) => console.log('[A] uncaught:', e.message))
process.on('unhandledRejection', (e) => console.log('[A] rejection:', String(e).slice(0, 200)))

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const downloadOne = async (url, dest) => {
  const target = `${url}${url.includes('?') ? '&' : '?'}width=640`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; 13styles-brandify)' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    await sharp(buffer).rotate().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 80 }).toFile(dest)
  } finally {
    clearTimeout(timer)
  }
}

const main = async () => {
  const TIME_LIMIT = Number(process.env.MAX_SECONDS || 480) * 1000
  const startedAll = Date.now()
  const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'import-plan.json'), 'utf-8'))
  const products = plan.products.filter((item) => item.images.length > 0)
  fs.mkdirSync(SRC_DIR, { recursive: true })

  const tasks = []
  for (const product of products) {
    for (let i = 0; i < Math.min(product.images.length, IMAGES_PER_PRODUCT); i += 1) {
      tasks.push({ slug: product.slug, url: product.images[i], index: i })
    }
  }
  console.log(`[A] задач: ${tasks.length}`)

  let failed = 0
  const started = Date.now()

  for (let i = 0; i < tasks.length; i += CHUNK) {
    if (Date.now() - startedAll > TIME_LIMIT) {
      console.log(`[A] лимит времени, выход на ${i}/${tasks.length}`)
      break
    }
    const batch = tasks.slice(i, i + CHUNK)
    await Promise.allSettled(
      batch.map(async ({ slug, url, index }) => {
        const dest = path.join(SRC_DIR, `${slug}-${index + 1}.webp`)
        if (fs.existsSync(dest)) return
        try {
          await downloadOne(url, dest)
        } catch {
          try {
            await sleep(1200)
            await downloadOne(url, dest)
          } catch {
            failed += 1
            if (failed % 50 === 0) console.log(`[A] ошибка: ${slug}-${index + 1}`)
          }
        }
      }),
    )
    const done = Math.min(i + CHUNK, tasks.length)
    if ((i / CHUNK) % 25 === 0) {
      const minutes = ((Date.now() - started) / 60000).toFixed(1)
      console.log(`[A] ${done}/${tasks.length} (ошибок ${failed}, ${minutes} мин)`)
    }
    if (i % 400 === 0 && i > 0) await sleep(1500)
  }
  console.log(`[A] ГОТОВО: ${tasks.length} задач, ошибок ${failed}`)
}

main()
