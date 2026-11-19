// Production-запуск витрины 13 STYLES с портами из .env — npm start / pm2.
//
// Файл намеренно CommonJS (.cjs): pm2 безошибочно поднимает его нативным
// Node-интерпретатором, поэтому require() здесь обязателен.
/* eslint-disable @typescript-eslint/no-require-imports */
//
// Читает .env из корня проекта (PORT, CHAT_PORT, DOKU_* и остальные) и запускает
// standalone-сервер Next.js (.next/standalone/server.js) в текущем процессе.
// Переменные окружения процесса имеют приоритет над .env.
//
// Запуск:
//   npm start                                  (порт берётся из PORT в .env, по умолчанию 3000)
//   pm2 start scripts/start-web.cjs --name web (pm2 сам поднимет этот файл Node-интерпретатором)
//
// Порт чат-сервиса задаётся рядом в .env — CHAT_PORT (по умолчанию 3003):
//   pm2 start mini-services/chat-service/index.js --name chat

const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..')

// .env из корня проекта: KEY=VALUE, комментарии и пустые строки пропускаются
try {
  const raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf-8')
  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim()
    }
  }
} catch {}

const serverPath = path.join(ROOT, '.next', 'standalone', 'server.js')
if (!fs.existsSync(serverPath)) {
  console.error('[start-web] не найден .next/standalone/server.js — сначала выполните: npm run build')
  process.exit(1)
}

process.env.PORT = process.env.PORT || '3000'
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0'
console.log(`[start-web] витрина 13 STYLES запускается на порту ${process.env.PORT} (PORT из .env)`)

// --- Диагностика падений: печатаем РЕАЛЬНЫЙ стек вместо «ignore-listed frames» ---
// Node скрывает кадры стека, помеченные в source-map как ignoreList (внутренности
// Next.js), и при рекурсии в фреймворке в логе остаётся только
// «RangeError: Maximum call stack size exceeded at ignore-listed frames».
// Собственный prepareStackTrace возвращает сырые кадры V8 с реальными
// путями файлов — по ним виден источник падения.
Error.stackTraceLimit = 60
Error.prepareStackTrace = (err, frames) => [
  `${err.name}: ${err.message}`,
  ...frames.map((frame) => `    at ${frame}`),
].join('\n')

const logCrash = (kind, err) => {
  console.error(`[start-web] ${kind} — процесс будет перезапущен pm2. Полный стек:`)
  console.error(err && err.stack ? err.stack : err)
  process.exit(1)
}
process.on('uncaughtException', (err) => logCrash('НЕПЕРЕХВАЧЕННОЕ ИСКЛЮЧЕНИЕ', err))
process.on('unhandledRejection', (err) => logCrash('ОТКЛОНЁННЫЙ ПРОМИС', err))

require(serverPath)

// Next.js во время require() подменяет Error.prepareStackTrace своим патчем
// (node-environment-extensions/error-inspect.js) и сворачивает внутренние кадры
// в «at ignore-listed frames». Краш ловится собственным .catch генерируемого
// server.js и печатается ПОСЛЕ require — поэтому переприсваиваем сырой
// форматтер здесь: в логе pm2 будут реальные пути файлов и функции.
Error.prepareStackTrace = (err, frames) => [
  `${err.name}: ${err.message}`,
  ...frames.map((frame) => `    at ${frame}`),
].join('\n')
console.log('[start-web] диагностика стека активна — падения будут с реальными кадрами')
