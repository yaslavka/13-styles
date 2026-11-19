import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/config/chat-port — порт socket.io чат-сервиса из .env (CHAT_PORT, по умолчанию 3003).
// Клиентский хук useChat запрашивает порт в рантайме, поэтому смена порта в .env
// + перезапуск процесса не требуют пересборки клиента.
const GET = async () => {
  const port = Number(process.env.CHAT_PORT) || 3003
  return NextResponse.json({ port }, { headers: { 'Cache-Control': 'no-store' } })
}

export { GET }
