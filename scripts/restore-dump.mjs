// Восстановление дампа базы 13 STYLES: если БД отсутствует или пуста,
// разворачивается снапшот db/seed/custom.db.gz (все категории, подкатегории,
// товары каталога и Garments2Look, декор). Запуск: node scripts/restore-dump.mjs
// Кроссплатформенно (Windows + Linux): перед копированием гарантированно
// закрываем все открытые дескрипторы БД — Windows блокирует файл на запись,
// пока его держит открытым процесс.

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

// Служебные файлы SQLite, которые могут остаться от прошлой сессии
const SIDE_FILES = ['-journal', '-wal', '-shm']

const db = new PrismaClient()

const copySeed = () => {
  for (const suffix of SIDE_FILES) {
    try { fs.rmSync(DB_PATH + suffix) } catch {}
  }
  if (fs.existsSync(SEED_GZ_PATH)) {
    // Основной формат снапшота — gzip (БД с Garments2Look > 100 МБ, лимит GitHub на файл)
    fs.writeFileSync(DB_PATH, zlib.gunzipSync(fs.readFileSync(SEED_GZ_PATH)))
    console.log('[restore] БД восстановлена из дампа: db/seed/custom.db.gz → db/custom.db')
  } else {
    fs.copyFileSync(SEED_DB_PATH, DB_PATH)
    console.log('[restore] БД восстановлена из дампа: db/seed/custom.db → db/custom.db')
  }
  for (const suffix of SIDE_FILES) {
    try { fs.rmSync(DB_PATH + suffix) } catch {}
  }
}

const main = async () => {
  if (!fs.existsSync(SEED_GZ_PATH) && !fs.existsSync(SEED_DB_PATH)) {
    console.log('[restore] дамп db/seed/custom.db(.gz) не найден — пропускаем (БД создаётся через prisma db push)')
    return
  }

  // Быстрый путь: файла БД ещё нет (чистый клон) — сразу разворачиваем дамп,
  // даже не открывая Prisma, чтобы не создавать пустую базу и не держать дескриптор
  if (!fs.existsSync(DB_PATH)) {
    copySeed()
    return
  }

  // Файл есть — проверяем наполненность
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

  // Критично для Windows: отпускаем файл перед перезаписью
  try { await db.$disconnect() } catch {}
  await new Promise((resolve) => setTimeout(resolve, 250))
  copySeed()
}

main()
  .catch((error) => {
    console.error('[restore] ошибка:', error?.message || error)
    process.exit(1)
  })
  .finally(async () => {
    try { await db.$disconnect() } catch {}
  })
