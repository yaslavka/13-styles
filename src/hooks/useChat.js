'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

// Хук чата поддержки на socket.io.
// Соединение — синглтон на роль ('user' | 'support'), чтобы не плодить сокеты.
// Порт чат-сервиса берётся в рантайме у /api/config/chat-port (CHAT_PORT из .env
// на сервере) — смена порта не требует пересборки клиента, только перезапуск.

// Резолв порта — один раз на вкладку (промис кэшируется)
let chatPortPromise = null
const resolveChatPort = () => {
  if (!chatPortPromise) {
    chatPortPromise = fetch('/api/config/chat-port', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => Number(data?.port) || Number(process.env.NEXT_PUBLIC_CHAT_PORT) || 3003)
      .catch(() => Number(process.env.NEXT_PUBLIC_CHAT_PORT) || 3003)
  }
  return chatPortPromise
}

const sockets = new Map()

const getSocket = (role, port) => {
  if (!sockets.has(role)) {
    const socket = io(`/?XTransformPort=${port}`, {
      // path обязан совпадать с сервером чата (socket.ioServer({ path: '/' }))
      path: '/',
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      timeout: 10000,
    })
    sockets.set(role, socket)
  }
  return sockets.get(role)
}

const TYPING_TTL = 2200

const useChat = ({ role, roomId = '', userName = '' } = {}) => {
  const [connected, setConnected] = useState(false)
  const [supportOnline, setSupportOnline] = useState(false)
  const [messages, setMessages] = useState([])
  const [rooms, setRooms] = useState([])
  const [typingWho, setTypingWho] = useState('')
  const socketRef = useRef(null)
  const typingTimerRef = useRef(null)

  useEffect(() => {
    let active = true

    const onConnect = () => {
      setConnected(true)
      if (role === 'user') {
        socketRef.current?.emit('hello', { role, roomId, userName: userName || 'Guest' })
      } else {
        socketRef.current?.emit('hello', { role })
      }
    }

    const onDisconnect = () => setConnected(false)

    const onHistory = (payload) => {
      setMessages(payload.messages || [])
      if (typeof payload.supportOnline === 'boolean') setSupportOnline(payload.supportOnline)
    }

    const onMessage = (message) => {
      setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]))
    }

    const onRooms = (list) => setRooms(Array.isArray(list) ? list : [])

    const onOnline = (payload) => setSupportOnline(Boolean(payload?.online))

    const onTyping = (payload) => {
      const who = payload?.who || ''
      if (role === 'user' && who === 'user') return
      if (role === 'support' && who === 'support') return
      setTypingWho(who)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => setTypingWho(''), TYPING_TTL)
    }

    // Порт приходит из /api/config/chat-port — подключаемся после резолва
    resolveChatPort().then((port) => {
      if (!active) return
      const socket = getSocket(role, port)
      socketRef.current = socket

      socket.on('connect', onConnect)
      socket.on('disconnect', onDisconnect)
      socket.on('chat:history', onHistory)
      socket.on('chat:message', onMessage)
      socket.on('rooms:update', onRooms)
      socket.on('chat:online', onOnline)
      socket.on('chat:typing', onTyping)

      if (socket.connected) onConnect()
    })

    return () => {
      active = false
      const socket = socketRef.current
      if (socket) {
        socket.off('connect', onConnect)
        socket.off('disconnect', onDisconnect)
        socket.off('chat:history', onHistory)
        socket.off('chat:message', onMessage)
        socket.off('rooms:update', onRooms)
        socket.off('chat:online', onOnline)
        socket.off('chat:typing', onTyping)
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [role, roomId, userName])

  const sendUserMessage = useCallback((text) => {
    const socket = socketRef.current
    if (socket && text && text.trim()) socket.emit('user:message', { text: text.trim() })
  }, [])

  const sendSupportMessage = useCallback((targetRoomId, text) => {
    const socket = socketRef.current
    if (socket && targetRoomId && text && text.trim()) socket.emit('support:message', { roomId: targetRoomId, text: text.trim() })
  }, [])

  const openRoom = useCallback((targetRoomId) => {
    const socket = socketRef.current
    if (socket && targetRoomId) socket.emit('support:open', { roomId: targetRoomId })
  }, [])

  const markRead = useCallback((targetRoomId) => {
    const socket = socketRef.current
    if (socket && targetRoomId) socket.emit('support:read', { roomId: targetRoomId })
  }, [])

  const notifyTyping = useCallback(() => {
    const socket = socketRef.current
    if (socket) socket.emit('chat:typing', { who: role === 'user' ? 'user' : 'support' })
  }, [role])

  return {
    connected,
    supportOnline,
    messages,
    rooms,
    typingWho,
    sendUserMessage,
    sendSupportMessage,
    openRoom,
    markRead,
    notifyTyping,
  }
}

export default useChat
