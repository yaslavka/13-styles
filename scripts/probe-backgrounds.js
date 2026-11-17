// Зонд исходных фото: определяем тип фона (белый студийный / тёмый / пёстрый)
// и проверяем скорость. Запуск: bun scripts/probe-backgrounds.js
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const SRC = path.join(process.cwd(), 'data', 'sources')

const cornerStats = async (file) => {
  const img = sharp(file)
  const meta = await img.metadata()
  const w = meta.width
  const h = meta.height
  const patch = Math.max(8, Math.round(Math.min(w, h) * 0.04))
  const spots = [
    [0, 0], [w - patch, 0], [0, h - patch], [w - patch, h - patch],
    [Math.round(w / 2 - patch / 2), 0], [Math.round(w / 2 - patch / 2), h - patch],
  ]
  let bright = 0
  let uniform = 0
  for (const [left, top] of spots) {
    const { data, info } = await img.clone().extract({ left, top, width: patch, height: patch }).raw().toBuffer({ resolveWithObject: true })
    let sum = 0
    let sumSq = 0
    const n = info.width * info.height
    for (let i = 0; i < n; i += 1) {
      const r = data[i * info.channels]
      const g = data[i * info.channels + 1]
      const b = data[i * info.channels + 2]
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      sum += lum
      sumSq += lum * lum
    }
    const mean = sum / n
    const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean))
    if (mean > 225) bright += 1
    if (std < 14) uniform += 1
  }
  return { bright, uniform, spots: spots.length }
}

const main = async () => {
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.webp')).slice(0, 120)
  let white = 0
  let uniformLightish = 0
  let busy = 0
  const t0 = Date.now()
  for (const f of files) {
    const s = await cornerStats(path.join(SRC, f))
    if (s.bright >= 5) white += 1
    else if (s.uniform >= 5) uniformLightish += 1
    else busy += 1
  }
  console.log(`белый фон: ${white}, однотонный: ${uniformLightish}, пёстрый: ${busy}, всего ${files.length}, ${(Date.now() - t0) / files.length}мс/файл`)
}

main()
