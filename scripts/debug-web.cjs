// Диагностический запуск витрины 13 STYLES БЕЗ pm2 — печатает РЕАЛЬНЫЙ стек падения.
//
// Зачем: Next.js при загрузке сервера подменяет Error.prepareStackTrace
// (node-environment-extensions/error-inspect.js) и сворачивает внутренние кадры
// в «at ignore-listed frames». Падение ловится собственным .catch генерируемого
// server.js (console.error + process.exit(1)), поэтому обработчики
// uncaughtException не срабатывают. Этот скрипт:
//   1) включает сырые кадры ДО загрузки Next.js;
//   2) ПОСЛЕ require(server.js) переприсваивает prepareStackTrace, перекрывая
//      патч Next.js, — ошибку по-прежнему печатает .catch самого Next.js,
//      но теперь с реальными путями файлов и функциями.
//
// Запуск (pm2 остановить, чтобы не держал порт):
//   pm2 stop web
//   PORT=3004 node scripts/debug-web.cjs 2>&1 | tee /tmp/web-debug.log
//
// Эксперимент с увеличенным стеком (если рекурсия глубокая, но конечная,
// сервер может стартовать — это тоже диагноз):
//   PORT=3004 node --stack-size=8000 scripts/debug-web.cjs 2>&1 | tee /tmp/web-debug-bigstack.log
//
// Для возврата к боевой конфигурации: pm2 restart web

// Файл намеренно CommonJS (.cjs) — как start-web.cjs, поэтому require() здесь обязателен.
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..')

// .env из корня проекта — как в start-web.cjs
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
  console.error('[debug-web] не найден .next/standalone/server.js — сначала выполните: npm run build')
  process.exit(1)
}

process.env.PORT = process.env.PORT || '3000'
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0'

// Сырой форматтер: все кадры V8 с реальными файлами, без source-map и ignore-list
const rawPrepareStackTrace = (err, frames) => [
  `${err.name}: ${err.message}`,
  ...frames.map((frame) => `    at ${frame}`),
].join('\n')

Error.stackTraceLimit = 200
Error.prepareStackTrace = rawPrepareStackTrace
console.log(`[debug-web] запуск витрины на порту ${process.env.PORT} — диагностика стека включена (лимит кадров: ${Error.stackTraceLimit})`)

require(serverPath)

// Next.js во время require() подменил Error.prepareStackTrace своим патчем —
// перекрываем обратно. Краш произойдёт позже, в async-продолжении startServer,
// и будет напечатан .catch-ом самого Next.js уже нашим сырым форматтером.
Error.prepareStackTrace = rawPrepareStackTrace
console.log('[debug-web] патч Next.js на форматирование стека перекрыт — падения будут с реальными кадрами')
