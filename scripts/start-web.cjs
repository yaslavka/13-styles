// Production-запуск витрины 13 STYLES с портами из .env — npm start / pm2.
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
require(serverPath)
