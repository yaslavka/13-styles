// 13-styles-chat-service — socket.io support chat micro-service (marketplace "техподдержка").
// Contract: visitors connect with role 'user' into per-visitor rooms, tech support
// connects with role 'support', watches the room list and answers inside rooms.

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { Server } from 'socket.io'

const PORT = 3003
const MAX_MESSAGES = 200
const MAX_ROOMS = 200

// ---------- in-memory state ----------
const rooms = new Map() // roomId -> { id, userName, messages: [], unread, lastText, lastAt, createdAt }
const supportSockets = new Set() // socket.id of sockets joined as 'support'

// ---------- http + socket.io ----------
const httpServer = createServer()

const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ---------- helpers (arrow functions only) ----------
const makeId = () => randomUUID()

const sanitizeRoomId = (raw) =>
  String(raw ?? '')
    .slice(0, 64)
    .replace(/[^a-zA-Z0-9_-]/g, '')

const normalizeText = (text) => {
  if (typeof text !== 'string') return null
  const trimmed = text.trim()
  if (trimmed.length < 1 || trimmed.length > 1000) return null
  return trimmed
}

const snapshot = () =>
  Array.from(rooms.values())
    .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0))
    .map((room) => ({
      id: room.id,
      userName: room.userName,
      lastText: room.lastText,
      lastAt: room.lastAt,
      unread: room.unread,
      messageCount: room.messages.length,
    }))

const evictOldestRooms = () => {
  while (rooms.size >= MAX_ROOMS) {
    let oldestId = null
    let oldestAt = Infinity
    for (const room of rooms.values()) {
      const at = room.lastAt || 0
      if (at < oldestAt) {
        oldestAt = at
        oldestId = room.id
      }
    }
    if (oldestId === null) break
    rooms.delete(oldestId)
    console.log(`[chat] evicted oldest room ${oldestId}`)
  }
}

const pushMessage = (room, message) => {
  room.messages.push(message)
  if (room.messages.length > MAX_MESSAGES) {
    room.messages.splice(0, room.messages.length - MAX_MESSAGES)
  }
}

// ---------- socket protocol ----------
io.on('connection', (socket) => {
  console.log(`[chat] connect ${socket.id}`)

  // 1. hello { role, roomId, userName }
  socket.on('hello', (payload) => {
    const data = payload || {}

    if (data.role === 'user') {
      const roomId = sanitizeRoomId(data.roomId) || `user-${socket.id}`
      socket.join(roomId)
      socket.data.roomId = roomId
      socket.data.role = 'user'

      let room = rooms.get(roomId)
      if (!room) {
        evictOldestRooms()
        const now = Date.now()
        room = {
          id: roomId,
          userName: 'Гость',
          messages: [],
          unread: 0,
          lastText: '',
          lastAt: now,
          createdAt: now,
        }
        if (data.userName) room.userName = String(data.userName).slice(0, 40)
        rooms.set(roomId, room)
        console.log(`[chat] user joined ${roomId} as "${room.userName}"`)
      }

      socket.emit('chat:history', {
        roomId,
        messages: room.messages,
        supportOnline: supportSockets.size > 0,
      })
      io.to('support').emit('rooms:update', snapshot())
      return
    }

    if (data.role === 'support') {
      socket.join('support')
      supportSockets.add(socket.id)
      socket.data.role = 'support'
      socket.emit('rooms:update', snapshot())
      io.emit('chat:online', { online: true })
      console.log(`[chat] support joined (${supportSockets.size} online)`)
    }
  })

  // 2. user:message { text }
  socket.on('user:message', (payload) => {
    const data = payload || {}
    const text = normalizeText(data.text)
    if (!text || socket.data.role !== 'user' || !socket.data.roomId) return

    const room = rooms.get(socket.data.roomId)
    if (!room) return

    const ts = Date.now()
    const message = { id: makeId(), from: 'user', text, ts }
    pushMessage(room, message)
    room.lastText = text
    room.lastAt = ts
    room.unread += 1

    io.to(room.id).emit('chat:message', message)
    io.to('support').emit('rooms:update', snapshot())
    console.log(`[chat] user ${room.id}: ${text.slice(0, 48)}`)
  })

  // 3. support:message { roomId, text }
  socket.on('support:message', (payload) => {
    const data = payload || {}
    const text = normalizeText(data.text)
    if (!text || socket.data.role !== 'support') return

    const roomId = String(data.roomId ?? '')
    const room = rooms.get(roomId)
    if (!room) return

    const ts = Date.now()
    const message = { id: makeId(), from: 'support', text, ts }
    pushMessage(room, message)
    room.lastText = text
    room.lastAt = ts

    io.to(roomId).emit('chat:message', message)
    console.log(`[chat] support -> ${roomId}: ${text.slice(0, 48)}`)
  })

  // 4. support:open { roomId }
  socket.on('support:open', (payload) => {
    if (socket.data.role !== 'support') return
    const data = payload || {}
    const roomId = String(data.roomId ?? '')
    const room = rooms.get(roomId)
    if (!room) return

    socket.join(roomId)
    room.unread = 0
    socket.emit('chat:history', { roomId, messages: room.messages })
    io.to('support').emit('rooms:update', snapshot())
  })

  // 5. support:read { roomId }
  socket.on('support:read', (payload) => {
    if (socket.data.role !== 'support') return
    const data = payload || {}
    const roomId = String(data.roomId ?? '')
    const room = rooms.get(roomId)
    if (!room) return

    room.unread = 0
    io.to('support').emit('rooms:update', snapshot())
  })

  // 6. chat:typing { who }
  socket.on('chat:typing', (payload) => {
    const data = payload || {}
    const who = data.who
    if (who !== 'user' && who !== 'support') return
    if (!socket.data.roomId) return
    io.to(socket.data.roomId).emit('chat:typing', { roomId: socket.data.roomId, who })
  })

  // 7. rooms:list
  socket.on('rooms:list', () => {
    if (socket.data.role !== 'support') return
    socket.emit('rooms:update', snapshot())
  })

  socket.on('disconnect', () => {
    if (socket.data.role === 'support') {
      supportSockets.delete(socket.id)
      if (supportSockets.size === 0) io.emit('chat:online', { online: false })
    }
    io.to('support').emit('rooms:update', snapshot())
    console.log(`[chat] disconnect ${socket.id} role=${socket.data.role || 'anon'}`)
  })
})

// ---------- graceful shutdown ----------
const shutdown = () => {
  console.log('[chat] shutting down...')
  io.close()
  httpServer.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 2000).unref()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

httpServer.listen(PORT, () => console.log(`[chat] chat-service listening on port ${PORT} (socket.io path '/')`))
