// Снапшот базы 13 STYLES для быстрого восстановления на чистой машине:
// чекпоинт WAL → копия db/custom.db в db/seed/custom.db (коммитится в репозиторий).
// Запуск: node scripts/make-dump.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DB_PATH = path.join(ROOT, 'db', 'custom.db')
const SEED_DB_PATH = path.join(ROOT, 'db', 'seed', 'custom.db')

const db = new PrismaClient()

const main = async () => {
  const products = await db.product.count()
  await db.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)')
  await db.$disconnect()
  fs.mkdirSync(path.dirname(SEED_DB_PATH), { recursive: true })
  fs.copyFileSync(DB_PATH, SEED_DB_PATH)
  console.log(`[dump] снапшот сохранён: db/seed/custom.db (${products} товаров, ${(fs.statSync(SEED_DB_PATH).size / 1048576).toFixed(1)} МБ)`)
}

main()
  .catch((error) => {
    console.error('[dump] ошибка:', error?.message || error)
    process.exit(1)
  })
  .finally(async () => {
    try { await db.$disconnect() } catch {}
  })
