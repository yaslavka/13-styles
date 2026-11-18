// Копирование статических ассетов в standalone-сборку (кроссплатформенно:
// заменяет `cp -r` из старой build-команды, который не работает на Windows).
// Запуск: node scripts/afterbuild.mjs (вызывается из npm run build)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const STATIC_SRC = path.join(ROOT, '.next', 'static')
const STATIC_DST = path.join(ROOT, '.next', 'standalone', '.next', 'static')
const PUBLIC_SRC = path.join(ROOT, 'public')
const PUBLIC_DST = path.join(ROOT, '.next', 'standalone', 'public')

const copyDir = (src, dst) => {
  fs.mkdirSync(dst, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name)
    const to = path.join(dst, entry.name)
    if (entry.isDirectory()) copyDir(from, to)
    else fs.copyFileSync(from, to)
  }
}

for (const [src, dst] of [[STATIC_SRC, STATIC_DST], [PUBLIC_SRC, PUBLIC_DST]]) {
  if (!fs.existsSync(src)) {
    console.log(`[afterbuild] ${path.relative(ROOT, src)} не найден — пропускаем`)
    continue
  }
  copyDir(src, dst)
  console.log(`[afterbuild] скопировано: ${path.relative(ROOT, src)} → ${path.relative(ROOT, dst)}`)
}
