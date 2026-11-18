// Восстановление дампа базы 13 STYLES: если БД отсутствует или пуста,
// разворачивается снапшот db/seed/custom.db (все категории, подкатегории,
// товары каталога, декор). Запуск: node scripts/restore-dump.mjs

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
  let products = 0
  try {
    products = await db.product.count()
  } catch {
    products = -1 // таблиц нет — считаем БД пустой
  }

  if (products > 50) {
    console.log(`[restore] БД уже наполнена (${products} товаров) — восстановление не требуется`)
    return
  }

  if (!fs.existsSync(SEED_DB_PATH)) {
    console.log('[restore] дамп db/seed/custom.db не найден — пропускаем (БД создаётся через prisma db push)')
    return
  }

  try {
    await db.$disconnect()
  } catch {}

  fs.copyFileSync(SEED_DB_PATH, DB_PATH)
  for (const suffix of ['-wal', '-shm']) {
    try { fs.rmSync(DB_PATH + suffix) } catch {}
  }
  console.log(`[restore] БД восстановлена из дампа: db/seed/custom.db → db/custom.db`)
}

main()
  .catch((error) => {
    console.error('[restore] ошибка:', error?.message || error)
    process.exit(1)
  })
  .finally(async () => {
    try { await db.$disconnect() } catch {}
  })
