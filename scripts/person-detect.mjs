// Локальный детектор людей YOLOv8n (onnxruntime-node, без внешних квот)
// Режимы:
//   bun scripts/person-detect.mjs test                — калибровка против VLM-вердиктов
//   bun scripts/person-detect.mjs run N               — до N товаров (resume, data/person-verdicts.json)
//   bun scripts/person-detect.mjs file <path...>      — конкретные файлы
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const ROOT = process.cwd()
const MODEL = path.join(ROOT, 'data', 'models', 'yolov8n.onnx')
const SRC_DIR = path.join(ROOT, 'data', 'sources')
const OUT_CACHE = path.join(ROOT, 'data', 'person-verdicts.json')
const IMG = 448
const CONF = 0.3
const IOU = 0.45

const loadVerdicts = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : {})

let session = null
let ort = null
const getSession = async () => {
  if (!session) {
    ort = await import('onnxruntime-node')
    session = await ort.InferenceSession.create(MODEL, { executionProviders: ['cpu'], graphOptimizationLevel: 'all' })
  }
  return session
}

// letterbox 640x640 + нормализация
const preprocess = async (file) => {
  const raw = await sharp(file).rotate().resize(IMG, IMG, { fit: 'contain', background: { r: 114, g: 114, b: 114 } }).removeAlpha().raw().toBuffer()
  const pixels = new Float32Array(3 * IMG * IMG)
  const area = IMG * IMG
  for (let i = 0; i < area; i += 1) {
    pixels[i] = raw[i * 3] / 255
    pixels[area + i] = raw[i * 3 + 1] / 255
    pixels[2 * area + i] = raw[i * 3 + 2] / 255
  }
  return pixels
}

const iou = (a, b) => {
  const x1 = Math.max(a[0], b[0])
  const y1 = Math.max(a[1], b[1])
  const x2 = Math.min(a[2], b[2])
  const y2 = Math.min(a[3], b[3])
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const areaA = (a[2] - a[0]) * (a[3] - a[1])
  const areaB = (b[2] - b[0]) * (b[3] - b[1])
  return inter / Math.max(1e-6, areaA + areaB - inter)
}

// файл → есть ли человек. Модель COCO с NMS: выход [1,50,6] = [x1,y1,x2,y2,conf,cls]
// Человек — строго класс 0 (COCO 'person'); прочие классы (обувь, сумки) игнорируем
const detectPersonFile = async (file) => {
  const s = await getSession()
  const input = await preprocess(file)
  const feeds = { images: new ort.Tensor('float32', input, [1, 3, IMG, IMG]) }
  const results = await s.run(feeds)
  const output = results[Object.keys(results)[0]]
  const d = output.data
  const rows = Math.floor(d.length / 6)
  const kept = []
  for (let r = 0; r < rows; r += 1) {
    const conf = d[r * 6 + 4]
    const cls = Math.round(d[r * 6 + 5])
    if (conf > CONF && cls === 0) {
      kept.push(Number(conf.toFixed(2)))
    }
  }
  return { person: kept.length > 0, count: kept.length, best: kept.length ? Math.max(...kept) : 0 }
}

const productSources = (product) => {
  const files = []
  for (let i = 0; i < 2; i += 1) {
    const f = path.join(SRC_DIR, `${product.slug}-${i + 1}.webp`)
    if (fs.existsSync(f)) files.push(f)
  }
  return files
}

const runProducts = async (limit) => {
  const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'import-plan.json'), 'utf-8'))
  const verdicts = loadVerdicts(OUT_CACHE)
  const pending = plan.products.filter((p) => verdicts[p.slug] === undefined && (fs.existsSync(path.join(SRC_DIR, `${p.slug}-1.webp`)) || fs.existsSync(path.join(SRC_DIR, `${p.slug}-2.webp`))))
  console.log(`[person] к проверке: ${pending.length}, лимит ${limit}`)
  const queue = pending.slice(0, limit)
  const started = Date.now()
  let persons = 0
  await getSession()
  let checked = 0
  for (const product of queue) {
    let person = false
    let best = 0
    for (const file of productSources(product)) {
      try {
        const r = await detectPersonFile(file)
        if (r.person) {
          person = true
          best = Math.max(best, r.best)
        }
      } catch (error) {
        console.log(`[person] ошибка ${path.basename(file)}: ${error.message}`)
      }
    }
    verdicts[product.slug] = person ? { verdict: 'PERSON', score: best } : { verdict: 'CLEAN', score: best }
    if (person) persons += 1
    checked += 1
    if (checked % 200 === 0) {
      fs.writeFileSync(OUT_CACHE, JSON.stringify(verdicts))
      console.log(`[person] ${checked}/${queue.length} • PERSON ${persons} • ${((Date.now() - started) / 1000).toFixed(0)}с`)
    }
  }
  fs.writeFileSync(OUT_CACHE, JSON.stringify(verdicts))
  console.log(`[person] готово: проверено ${queue.length}, PERSON ${persons} за ${((Date.now() - started) / 1000).toFixed(0)}с`)
}

const testCalibration = async () => {
  const vlm = loadVerdicts(path.join(ROOT, 'data', 'vlm-verdicts.json'))
  const mine = loadVerdicts(OUT_CACHE)
  const slugs = Object.keys(vlm).filter((s) => mine[s])
  let agree = 0
  for (const slug of slugs) {
    const vlmVerdict = vlm[slug]
    const mineVerdict = typeof mine[slug] === 'string' ? mine[slug] : mine[slug].verdict
    const ok = vlmVerdict === mineVerdict
    if (ok) agree += 1
    else console.log(`[calib] РАСХОЖДЕНИЕ: ${slug} vlm=${vlmVerdict} yolo=${mineVerdict} (score ${mine[slug].score})`)
  }
  console.log(`[calib] согласие YOLO vs VLM: ${agree}/${slugs.length}`)
}

const mode = process.argv[2]
if (mode === 'test') await testCalibration()
else if (mode === 'run') await runProducts(Number(process.argv[3] || 3000))
else if (mode === 'file') {
  await getSession()
  for (const f of process.argv.slice(3)) console.log(path.basename(f), JSON.stringify(await detectPersonFile(f)))
} else console.log('режимы: test | run N | file <paths>')
