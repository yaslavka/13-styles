'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquareText, X, SendHorizonal, Loader2 } from 'lucide-react'
import useChat from '@/hooks/useChat'
import useShop from '@/store/useShop'

// Плавающий виджет чата поддержки: реальное время через socket.io

const QUICK_QUESTIONS = ['Где мой заказ?', 'Как вернуть товар?', 'Какие размеры у худи?', 'Есть ли скидки?']

const ROOM_KEY = 'pixart-chat-room'

const getRoomId = () => {
  if (typeof window === 'undefined') return ''
  let roomId = window.localStorage.getItem(ROOM_KEY)
  if (!roomId) {
    roomId = `u-${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(ROOM_KEY, roomId)
  }
  return roomId
}

const ChatWidget = () => {
  const chatOpen = useShop((state) => state.chatOpen)
  const setChatOpen = useShop((state) => state.setChatOpen)

  const roomId = useMemo(() => getRoomId(), [])
  const { connected, supportOnline, messages, typingWho, sendUserMessage, notifyTyping } = useChat({
    role: 'user',
    roomId,
    userName: 'Гость',
  })

  const [input, setInput] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, typingWho, chatOpen])

  const send = (text) => {
    const value = (text ?? input).trim()
    if (!value) return
    sendUserMessage(value)
    setInput('')
  }

  return (
    <>
      <motion.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setChatOpen(!chatOpen)}
        aria-label={chatOpen ? 'Закрыть чат поддержки' : 'Открыть чат поддержки'}
        className="pixel-corners-sm fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center bg-gradient-to-br from-purple-600 via-purple-500 to-orange-500 text-white shadow-[0_0_26px_rgba(139,92,246,0.6)]"
      >
        {chatOpen ? <X className="h-6 w-6" aria-hidden /> : <MessageSquareText className="h-6 w-6" aria-hidden />}
        {!chatOpen && supportOnline ? (
          <span className="absolute -right-1 -top-1 h-3 w-3 bg-orange-400 animate-blink" aria-hidden />
        ) : null}
      </motion.button>

      <AnimatePresence>
        {chatOpen ? (
          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="pixel-corners fixed bottom-24 right-5 z-50 flex h-[480px] w-[min(92vw,360px)] flex-col overflow-hidden border border-purple-500/40 bg-[#0a0918] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            aria-label="Чат поддержки PIXART"
          >
            <header className="flex items-center gap-2.5 border-b border-purple-500/30 bg-gradient-to-r from-purple-900/50 to-orange-900/40 px-4 py-3">
              <span className="pixel-corners-sm grid h-9 w-9 place-items-center bg-black/40 font-display text-xs text-purple-200">
                PX
              </span>
              <div className="flex-1">
                <p className="font-display text-sm text-white">Поддержка PIXART</p>
                <p className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className={`h-2 w-2 ${supportOnline && connected ? 'bg-green-400 animate-blink' : connected ? 'bg-orange-400' : 'bg-red-400'}`}
                    aria-hidden
                  />
                  <span className="text-muted-foreground">
                    {connected ? (supportOnline ? 'Оператор на линии' : 'Ждём оператора…') : 'Соединение…'}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-muted-foreground hover:text-white"
                aria-label="Закрыть чат"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>

            <div ref={scrollRef} className="scrollbar-pixel flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <span className="font-display text-3xl text-purple-500/50 animate-blink">▚▞▚</span>
                  <p className="text-xs text-muted-foreground">Спроси что угодно о товарах, доставке или возврате</p>
                </div>
              ) : null}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`pixel-corners-sm max-w-[80%] px-3 py-2 text-sm leading-relaxed ${
                      message.from === 'user'
                        ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white'
                        : 'border border-orange-500/30 bg-orange-500/10 text-orange-100'
                    }`}
                  >
                    {message.from !== 'user' ? (
                      <span className="mb-0.5 block font-display text-[10px] uppercase tracking-wider text-orange-300">
                        Поддержка
                      </span>
                    ) : null}
                    {message.text}
                    <span className="ml-2 align-bottom text-[10px] text-white/50">
                      {new Date(message.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {typingWho === 'support' ? (
                <div className="flex justify-start">
                  <span className="pixel-corners-sm border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-200">
                    оператор печатает<span className="animate-blink">…</span>
                  </span>
                </div>
              ) : null}
            </div>

            <div className="border-t border-purple-500/25 px-3 pb-3 pt-2">
              {messages.length === 0 ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {QUICK_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => send(question)}
                      className="pixel-corners-sm border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[11px] text-purple-200 transition-colors hover:bg-purple-500/25"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              ) : null}

              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  send()
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value)
                    notifyTyping()
                  }}
                  placeholder={connected ? 'Сообщение…' : 'Подключаемся…'}
                  disabled={!connected}
                  maxLength={1000}
                  className="h-10 flex-1 rounded-md border border-purple-500/30 bg-[#0d0c1c] px-3 text-sm text-white placeholder:text-purple-300/40 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  aria-label="Текст сообщения"
                />
                <button
                  type="submit"
                  disabled={!connected || !input.trim()}
                  className="pixel-corners-sm grid h-10 w-10 place-items-center bg-gradient-to-br from-orange-500 to-purple-600 text-white disabled:opacity-40"
                  aria-label="Отправить сообщение"
                >
                  {!connected ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <SendHorizonal className="h-4 w-4" aria-hidden />}
                </button>
              </form>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </>
  )
}

export default ChatWidget
