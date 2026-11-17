'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquareText, X, SendHorizonal, Loader2 } from 'lucide-react'
import useChat from '@/hooks/useChat'
import useShop from '@/store/useShop'
import useT from '@/hooks/useT'

// Плавающий виджет чата поддержки: реальное время через socket.io, стеклянный дизайн

const QUICK_KEYS = ['chat.q1', 'chat.q2', 'chat.q3', 'chat.q4']

const ROOM_KEY = 'styles-chat-room'

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
  const t = useT()

  const roomId = useMemo(() => getRoomId(), [])
  const { connected, supportOnline, messages, typingWho, sendUserMessage, notifyTyping } = useChat({
    role: 'user',
    roomId,
    userName: 'Guest',
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
        aria-label={chatOpen ? t('chat.close') : t('chat.open')}
        className="glass-btn glass-btn-primary fixed bottom-6 right-6 z-40 grid h-15 w-15 place-items-center rounded-full"
      >
        {chatOpen ? <X className="h-6 w-6 text-white" aria-hidden /> : <MessageSquareText className="h-6 w-6 text-white" aria-hidden />}
        {!chatOpen && supportOnline ? (
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-orange-400 animate-blink" aria-hidden />
        ) : null}
      </motion.button>

      <AnimatePresence>
        {chatOpen ? (
          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="glass-card fixed bottom-26 right-6 z-40 flex h-[480px] w-[min(92vw,370px)] flex-col overflow-hidden"
            aria-label="13 STYLES support chat"
          >
            <header className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-purple-800/40 to-orange-800/30 px-4 py-3.5">
              <span className="glass-btn glass-btn-primary grid h-10 w-10 place-items-center rounded-2xl font-display text-xs font-bold text-white">
                13
              </span>
              <div className="flex-1">
                <p className="font-display text-sm font-bold text-white">{t('chat.title')}</p>
                <p className="flex items-center gap-1.5 text-[11px] font-bold">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${supportOnline && connected ? 'bg-green-400 animate-blink' : connected ? 'bg-orange-400' : 'bg-red-400'}`}
                    aria-hidden
                  />
                  <span className="text-muted-foreground">
                    {connected ? (supportOnline ? t('chat.operatorOnline') : t('chat.waiting')) : t('chat.connecting')}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="text-muted-foreground hover:text-white"
                aria-label={t('chat.close')}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>

            <div ref={scrollRef} className="scrollbar-glass flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 py-10 text-center">
                  <span className="font-display text-3xl text-purple-400/50 animate-blink">✦ ✧ ✦</span>
                  <p className="text-xs font-semibold text-muted-foreground">{t('chat.emptyHint')}</p>
                </div>
              ) : null}

              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[82%] px-4 py-2.5 text-sm font-semibold leading-relaxed ${
                      message.from === 'user'
                        ? 'glass-btn glass-btn-primary rounded-3xl rounded-br-lg text-white'
                        : 'glass-btn glass-btn-orange rounded-3xl rounded-bl-lg text-white'
                    }`}
                  >
                    {message.from !== 'user' ? (
                      <span className="mb-0.5 block font-display text-[10px] font-bold uppercase tracking-wider text-orange-100">
                        {t('chat.support')}
                      </span>
                    ) : null}
                    {message.text}
                    <span className="ml-2 align-bottom text-[10px] font-bold text-white/60">
                      {new Date(message.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {typingWho === 'support' ? (
                <div className="flex justify-start">
                  <span className="glass-btn glass-btn-ghost rounded-3xl px-4 py-2.5 text-xs font-bold text-purple-200">
                    {t('chat.typingSupport')}
                    <span className="animate-blink">…</span>
                  </span>
                </div>
              ) : null}
            </div>

            <div className="border-t border-white/10 px-3 pb-3 pt-2.5">
              {messages.length === 0 ? (
                <div className="mb-2.5 flex flex-wrap gap-2">
                  {QUICK_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => send(t(key))}
                      className="glass-btn glass-btn-ghost rounded-full px-3 py-1.5 text-[11px] font-bold text-purple-200"
                    >
                      {t(key)}
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
                  placeholder={connected ? t('chat.placeholder') : t('chat.placeholderOff')}
                  disabled={!connected}
                  maxLength={1000}
                  className="h-11 flex-1 rounded-full border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white placeholder:text-purple-300/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  aria-label={t('chat.placeholder')}
                />
                <button
                  type="submit"
                  disabled={!connected || !input.trim()}
                  className="glass-btn glass-btn-orange grid h-11 w-11 place-items-center rounded-full disabled:opacity-40"
                  aria-label={t('chat.send')}
                >
                  {!connected ? <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden /> : <SendHorizonal className="h-4 w-4 text-white" aria-hidden />}
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
