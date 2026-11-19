// ПОЛНЫЙ ОРКЕСТР 13 STYLES — одна команда `npm run dev` (работает и на Windows, и на Linux/macOS):
//   1. Готовит .env (DATABASE_URL, админ, секреты, ПОРТЫ) — если его нет; на Windows путь к БД
//      нормализуется в прямые слэши (Prisma не понимает обратные слэши в file:-URL)
//   2. prisma generate — если клиент не сгенерирован
//   3. Восстанавливает БД из дампа db/seed/custom.db — если база пустая/отсутствует
//   4. Досинхронизирует картинки каталога в фоне — если файлов не хватает
//   5. Ставит зависимости чат-микросервиса (если нужно) и запускает его на :CHAT_PORT (из .env)
//   6. Запускает Next.js dev-сервер на :PORT (из .env)
// Порты: PORT (витрина, по умолчанию 3000) и CHAT_PORT (чат, по умолчанию 3003) задаются
// в .env — проект можно поднять на любых свободных портах, стандартные заняты не проблема.
// Админ-панель создаётся автоматически: логин/пароль из .env (по умолчанию admin / 13styles2024).
// Запуск: node scripts/orchestrate.mjs (или npm run dev)

import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { spawn, spawnSync, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const ENV_PATH = path.join(ROOT, '.env')
const DB_PATH = path.join(ROOT, 'db', 'custom.db')
const CHAT_DIR = path.join(ROOT, 'mini-services', 'chat-service')

const children = []
let shuttingDown = false

const log = (msg) => console.log(`[orchestrate] ${msg}`)

const IS_WINDOWS = process.platform === 'win32'

// node или bun: предпочитаем node (Next.js под ним стабильнее)
const runtimeBin = () => {
  if (path.basename(process.execPath) === 'node') return process.execPath
  const probe = spawnSync('node', ['--version'])
  if (probe.status === 0) return 'node'
  return process.execPath
}

const portBusy = (port) =>
  new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(true))
    server.once('listening', () => server.close(() => resolve(false)))
    server.listen(port, '0.0.0.0')
  })

const readEnvFile = () => {
  const env = {}
  if (!fs.existsSync(ENV_PATH)) return env
  fs.readFileSync(ENV_PATH, 'utf-8')
    .split('\n')
    .forEach((line) => {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    })
  return env
}

// DATABASE_URL для Prisma/SQLite: только прямые слэши — обратные слэши Windows
// в file:-URL ломают парсер Prisma («Unable to open the database file»)
const toDbUrl = (dbPath) => `file:${dbPath.replace(/\\/g, '/')}`

const ensureEnv = () => {
  let env = readEnvFile()
  const needed = []
  const write = (key, value) => {
    env[key] = value
    needed.push(`${key}=${key === 'ADMIN_PASSWORD' || key === 'USER_AUTH_SECRET' ? '***' : value}`)
  }
  if (!env.DATABASE_URL) {
    write('DATABASE_URL', toDbUrl(DB_PATH))
  } else if (env.DATABASE_URL.includes('\\')) {
    // Починка уже существующего .env с обратными слэшами (после первого запуска на Windows)
    env.DATABASE_URL = env.DATABASE_URL.replace(/\\/g, '/')
    needed.push(`DATABASE_URL=${env.DATABASE_URL} (исправлены обратные слэши)`)
  }
  if (!env.NEXT_PUBLIC_SITE_URL) write('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
  if (!env.ADMIN_LOGIN) write('ADMIN_LOGIN', 'admin')
  if (!env.ADMIN_PASSWORD) write('ADMIN_PASSWORD', '13styles2024')
  if (!env.USER_AUTH_SECRET) write('USER_AUTH_SECRET', crypto.randomBytes(24).toString('hex'))
  // Порты запуска — в .env, чтобы поднять проект на свободных портах
  if (!env.PORT) write('PORT', '3000')
  if (!env.CHAT_PORT) write('CHAT_PORT', '3003')

  if (needed.length > 0) {
    // Записываем ВСЕ ключи из env: существующие (DOKU и прочие) не теряются при дозаписи
    const priorityKeys = ['DATABASE_URL', 'NEXT_PUBLIC_SITE_URL', 'ADMIN_LOGIN', 'ADMIN_PASSWORD', 'USER_AUTH_SECRET', 'PORT', 'CHAT_PORT']
    const restKeys = Object.keys(env).filter((key) => !priorityKeys.includes(key))
    const content = [
      '# Автосгенерировано scripts/orchestrate.mjs — можно править вручную',
      ...priorityKeys.map((key) => `${key}=${env[key]}`),
      ...restKeys.map((key) => `${key}=${env[key]}`),
      '',
    ].join('\n')
    fs.writeFileSync(ENV_PATH, content)
    console.log(`[orchestrate] .env создан (${needed.length} параметров) — админ-панель: логин "${env.ADMIN_LOGIN}", пароль "${env.ADMIN_PASSWORD}"`)
  }
  return env
}

const ensurePrismaClient = () => {
  const nextPkg = path.join(ROOT, 'node_modules', 'next', 'package.json')
  if (!fs.existsSync(nextPkg)) {
    console.error('[orchestrate] Зависимости не установлены — сначала выполните: npm install')
    process.exit(1)
  }
  const clientDir = path.join(ROOT, 'node_modules', '.prisma', 'client')
  if (fs.existsSync(clientDir)) return
  log('prisma generate...')
  execSync('npx prisma generate', { cwd: ROOT, stdio: 'inherit' })
}

const ensureImages = (env) => {
  const catalogDir = path.join(ROOT, 'public', 'products', 'catalog')
  let imageCount = 0
  try {
    imageCount = fs.readdirSync(catalogDir).filter((f) => f.endsWith('.webp')).length
  } catch {}
  if (imageCount >= 3000) {
    log(`изображения каталога на месте (${imageCount} webp) — синхронизация не нужна`)
    return
  }
  if (!fs.existsSync(path.join(ROOT, 'data', 'import-plan.json'))) {
    log(`изображений ${imageCount}, но data/import-plan.json недоступен — досинхронизация пропущена`)
    return
  }
  log(`изображений ${imageCount} < ожидаемых ~5500 — фоновая досинхронизация из CDN (не блокирует запуск)`)
  const child = spawn(runtimeBin(), ['scripts/fetch-catalog-images.mjs'], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: toDbUrl(DB_PATH) },
    detached: true,
    stdio: ['ignore', fs.openSync(path.join(ROOT, 'data', 'fetch-run.log'), 'a'), fs.openSync(path.join(ROOT, 'data', 'fetch-run.log'), 'a')],
  })
  child.unref()
}

// Garments2Look: импорт метаданных (если БД пустая) + публикация товаров,
// чьи фото скачаны в public/products/g2l (не блокирует запуск)
const syncGarments2Look = () => {
  const child = spawn(runtimeBin(), ['scripts/sync-garments2look.mjs'], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: toDbUrl(DB_PATH) },
    detached: true,
    stdio: ['ignore', fs.openSync(path.join(ROOT, 'data', 'g2l-sync.log'), 'a'), fs.openSync(path.join(ROOT, 'data', 'g2l-sync.log'), 'a')],
  })
  child.unref()
  log('g2l-sync запущен в фоне (публикация товаров Garments2Look с фото на диске)')
}

const ensureChatService = () => {
  if (!fs.existsSync(path.join(CHAT_DIR, 'index.js'))) {
    log('chat-service не найден — пропускаем')
    return null
  }
  if (!fs.existsSync(path.join(CHAT_DIR, 'node_modules'))) {
    log('установка зависимостей чат-сервиса...')
    try {
      // npm везде: и на Windows, и на Linux (bun не требуется)
      execSync('npm install --no-audit --no-fund', { cwd: CHAT_DIR, stdio: 'inherit', shell: IS_WINDOWS })
    } catch (error) {
      log(`не удалось установить зависимости чат-сервиса: ${error?.message}`)
      return null
    }
  }
  return { cmd: runtimeBin(), args: ['index.js'], cwd: CHAT_DIR }
}

const main = async () => {
  log('13 STYLES — полный оркестр запуска')
  const env = ensureEnv()
  ensurePrismaClient()

  // 3) Дамп БД, если база пустая
  const restore = spawnSync(runtimeBin(), ['scripts/restore-dump.mjs'], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: toDbUrl(DB_PATH) },
    stdio: 'inherit',
  })
  if (restore.status !== 0) log('восстановление дампа завершилось с предупреждением')

  // 4) Картинки каталога (фон)
  ensureImages(env)

  // 4.1) Garments2Look: метаданные + публикация по фото на диске (фон)
  syncGarments2Look()

  // 5) Чат-сервис на :CHAT_PORT (из .env, по умолчанию 3003)
  const chatPort = Number(env.CHAT_PORT || env.NEXT_PUBLIC_CHAT_PORT) || 3003
  if (await portBusy(chatPort)) {
    log(`чат-сервис уже слушает :${chatPort} — не запускаем второй`)
  } else {
    const chat = ensureChatService()
    if (chat) {
      const child = spawn(chat.cmd, chat.args, { cwd: chat.cwd, env: { ...process.env, ...env }, stdio: 'inherit' })
      children.push({ name: 'chat-service', proc: child })
      log(`чат-сервис запущен на :${chatPort}`)
    }
  }

  // 6) Next.js dev-сервер на :PORT (из .env, по умолчанию 3000)
  const webPort = Number(env.PORT) || 3000
  if (await portBusy(webPort)) {
    log(`порт ${webPort} занят — dev-сервер уже запущен, оркестр завершается без дублей`)
    return
  }
  const nextBin = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next')
  const next = spawn(runtimeBin(), [nextBin, 'dev', '-p', String(webPort)], {
    cwd: ROOT,
    env: { ...process.env, ...env, DATABASE_URL: toDbUrl(DB_PATH) },
    stdio: 'inherit',
  })
  children.push({ name: 'next-dev', proc: next })
  log(`Next.js dev-сервер запущен на http://localhost:${webPort}`)
  log('админ-панель: /admin — логин и пароль указаны в .env')

  const shutdown = (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    log(`получен ${signal} — останавливаем сервисы`)
    children.forEach(({ proc }) => {
      try { proc.kill(signal) } catch {}
    })
    process.exit(0)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  // Падение любого дочернего процесса завершает оркестр (npm run dev = единая точка)
  children.forEach(({ name, proc }) => {
    proc.on('exit', (code) => {
      if (!shuttingDown) {
        log(`${name} завершился (код ${code}) — оркестр останавливается`)
        shuttingDown = true
        children.forEach(({ proc: other }) => {
          if (other !== proc) { try { other.kill('SIGTERM') } catch {} }
        })
        process.exit(code || 0)
      }
    })
  })
}

main().catch((error) => {
  console.error('[orchestrate] фатальная ошибка:', error?.message || error)
  process.exit(1)
})
