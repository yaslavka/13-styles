// Поиск битых изображений: каждый файл проверяется в ОТДЕЛЬНОМ процессе,
// чтобы SIGSEGV от libvips не убил основной процесс.
// Запуск: node scripts/find-bad-images.mjs   (или bun)
// Битые файлы удаляются, список пишется в data/bad-images.json
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'

const SRC = path.join(process.cwd(), 'data', 'sources')
const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.webp'))

const magicOk = (buf) => {
  if (buf.length < 12) return false
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true // jpeg
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true // png
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true // webp
  return false
}

let badMagic = []
let badSharp = []
const checker = `
const sharp = require('sharp')
sharp(process.argv[1]).metadata().then(() => process.exit(0)).catch(() => process.exit(1))
`
const started = Date.now()
for (let i = 0; i < files.length; i += 1) {
  const file = path.join(SRC, files[i])
  const buf = fs.readFileSync(file)
  if (!magicOk(buf)) {
    badMagic.push(files[i])
    continue
  }
  const res = spawnSync(process.execPath, ['-e', checker, file], { timeout: 15000 })
  if (res.status !== 0) {
    badSharp.push(files[i])
    console.log(`[bad] ${files[i]} (crash/exit ${res.status})`)
  }
  if ((i + 1) % 300 === 0) console.log(`[bad] проверено ${i + 1}/${files.length}`)
}
fs.writeFileSync(path.join(process.cwd(), 'data', 'bad-images.json'), JSON.stringify({ badMagic, badSharp }, null, 1))
for (const f of [...badMagic, ...badSharp]) fs.unlinkSync(path.join(SRC, f))
console.log(`[bad] ГОТОВО за ${((Date.now() - started) / 1000).toFixed(0)}с: magic ${badMagic.length}, sharp ${badSharp.length} — файлы удалены`)
