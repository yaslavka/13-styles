// Снапшот базы 13 STYLES для быстрого восстановления на чистой машине:
// чекпоинт WAL → копия db/custom.db → gzip → db/seed/custom.db.gz (коммитится
// в репозиторий; полный размер БД с Garments2Look > 100 МБ — лимит GitHub).
// Запуск: node scripts/make-dump.mjs

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DB_PATH = path.join(ROOT, 'db', 'custom.db')
const SEED_DB_PATH = path.join(ROOT, 'db', 'seed', 'custom.db')
const SEED_GZ_PATH = path.join(ROOT, 'db', 'seed', 'custom.db.gz')

const db = new PrismaClient()

const main = async () => {
  const products = await db.product.count()
  await db.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)')
  await db.$disconnect()

  fs.mkdirSync(path.dirname(SEED_GZ_PATH), { recursive: true })
  const raw = fs.readFileSync(DB_PATH)
  const gz = zlib.gzipSync(raw, { level: 6 })
  fs.writeFileSync(SEED_GZ_PATH, gz)
  // старый плоский дамп больше не нужен
  try { fs.rmSync(SEED_DB_PATH) } catch {}
  console.log(`[dump] снапшот сохранён: db/seed/custom.db.gz (${products} товаров, ${(gz.length / 1048576).toFixed(1)} МБ из ${(raw.length / 1048576).toFixed(1)} МБ)`)
}

main()
  .catch((error) => {
    console.error('[dump] ошибка:', error?.message || error)
    process.exit(1)
  })
  .finally(async () => {
    try { await db.$disconnect() } catch {}
  })
