// Генератор мультяшных 3D фото товаров в стиле Pixar для 13 STYLES
// Запуск: bun scripts/generate-images.js
// Пропускает уже существующие файлы, работает в 4 параллельных воркера.

import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'products')
const CONCURRENCY = 2

const STYLE_BASE =
  'Pixar-style 3D cartoon render of a {SUBJECT}, vibrant {COLOR} colors, glossy playful cartoon-realistic look, soft studio lighting, smooth clean gradient background of deep purple blending into warm orange glow, centered composition, product floating slightly above a soft round shadow, ultra detailed, high quality render, no text, no watermark, no logo'

const SHOTS = [
  { suffix: '1', view: 'front view, perfectly centered' },
  { suffix: '2', view: 'dynamic three-quarter view, slightly zoomed in, dramatic angle' },
  { suffix: '3', view: 'back side view showing details' },
]

const PRODUCTS = [
  { slug: 'hoodie-neo-violet', subject: 'oversized violet purple hoodie with drawstrings and a kangaroo pocket', color: 'purple violet with orange accents' },
  { slug: 'tshirt-drip-orange', subject: 'orange t-shirt with a smooth abstract curved graphic print', color: 'juicy orange with white details' },
  { slug: 'bomber-cyber-blue', subject: 'blue bomber jacket with a zipper and ribbed cuffs', color: 'electric blue with purple lining' },
  { slug: 'jeans-grid-blue', subject: 'baggy blue denim jeans with contrast stitching', color: 'classic blue denim' },
  { slug: 'dress-neon-violet', subject: 'purple midi A-line dress with a belt, cartoon fabric folds', color: 'violet purple' },
  { slug: 'hoodie-pastel-lilac', subject: 'light lilac cropped hoodie with wide sleeves and embroidery', color: 'soft lilac lavender' },
  { slug: 'crop-chic-lilac', subject: 'lilac cropped ribbed t-shirt top', color: 'pale lilac' },
  { slug: 'jacket-retro-orange', subject: 'orange oversized jacket with contrast shoulder inserts', color: 'warm orange with purple inserts' },
  { slug: 'sneakers-run-orange', subject: 'orange running sneaker with a chunky soft sole', color: 'bright orange with white sole' },
  { slug: 'sneakers-force-blue', subject: 'blue sleek low-profile sneaker with perforated leather', color: 'deep blue' },
  { slug: 'boots-urban-night', subject: 'black high-top tactical boot with laces', color: 'midnight black with orange sole accents' },
  { slug: 'hightops-storm-violet', subject: 'violet high-top canvas sneaker with a thick sole', color: 'violet purple with lilac laces' },
  { slug: 'cap-drip-orange', subject: 'orange baseball cap with a curved brim', color: 'bright orange' },
  { slug: 'backpack-data-violet', subject: 'purple urban backpack with a front pocket', color: 'violet purple with orange zipper' },
  { slug: 'sunglasses-cyber-blue', subject: 'blue visor-style sunglasses with a single wide lens', color: 'glossy blue' },
  { slug: 'watch-time-orange', subject: 'orange wristwatch with a round dial and silicone strap', color: 'orange with white dial' },
]

const buildTasks = () => {
  const tasks = []
  for (const product of PRODUCTS) {
    for (const shot of SHOTS) {
      tasks.push({
        file: path.join(OUT_DIR, `${product.slug}-${shot.suffix}.png`),
        prompt: `${STYLE_BASE.replace('{SUBJECT}', product.subject).replace('{COLOR}', product.color)}, ${shot.view}`,
      })
    }
  }
  return tasks
}

const makeWorker = async (zai, workerIndex, tasks, status) => {
  while (true) {
    const task = tasks[status.cursor]
    status.cursor += 1
    if (!task) return
    if (fs.existsSync(task.file)) {
      status.done += 1
      continue
    }
    let attempt = 0
    while (attempt < 3) {
      attempt += 1
      try {
        const response = await zai.images.generations.create({ prompt: task.prompt, size: '1024x1024' })
        const base64 = response?.data?.[0]?.base64
        if (!base64) throw new Error('empty response')
        fs.writeFileSync(task.file, Buffer.from(base64, 'base64'))
        status.done += 1
        console.log(`[img] ${path.basename(task.file)} готов (${status.done}/${status.total}, воркер ${workerIndex})`)
        break
      } catch (error) {
        console.warn(`[img] ошибка ${path.basename(task.file)} попытка ${attempt}: ${error?.message || error}`)
        await new Promise((resolve) => setTimeout(resolve, 1200 * attempt))
      }
    }
  }
}

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const tasks = buildTasks()
  const status = { cursor: 0, done: 0, total: tasks.length }
  console.log(`[img] всего задач: ${tasks.length}, воркеров: ${CONCURRENCY}`)

  const zai = await ZAI.create()
  const workers = Array.from({ length: CONCURRENCY }, (_, index) => makeWorker(zai, index + 1, tasks, status))
  await Promise.all(workers)

  const missing = tasks.filter((task) => !fs.existsSync(task.file))
  console.log(`[img] завершено: ${status.done}/${status.total}, не создано: ${missing.length}`)
  if (missing.length) {
    console.log('[img] пропущены:', missing.map((task) => path.basename(task.file)).join(', '))
  }
}

main().catch((error) => {
  console.error('[img] фатальная ошибка:', error)
  process.exit(1)
})
