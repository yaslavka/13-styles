'use client'

import { useEffect, useRef, useState } from 'react'
import { SendHorizonal, MessagesSquare, Loader2 } from 'lucide-react'
import useChat from '@/hooks/useChat'

// Чат техподдержки: список диалогов слева, переписка справа, всё в реальном времени

const AdminChat = () => {
  const { connected, rooms, messages, typingWho, sendSupportMessage, openRoom, markRead } = useChat({ role: 'support' })
  const [activeRoom, setActiveRoom] = useState('')
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, typingWho])

  const selectRoom = (roomId) => {
    setActiveRoom(roomId)
    openRoom(roomId)
    markRead(roomId)
  }

  const send = (event) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || !activeRoom) return
    sendSupportMessage(activeRoom, text)
    setInput('')
  }

  const activeRoomInfo = rooms.find((room) => room.id === activeRoom)

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="rounded-2xl border border-purple-500/25 bg-card/70">
        <div className="flex items-center justify-between border-b border-purple-500/25 px-4 py-3">
          <h3 className="flex items-center gap-2 font-display text-sm text-white">
            <MessagesSquare className="h-4 w-4 text-orange-400" aria-hidden /> Диалоги
          </h3>
          <span className={`h-2.5 w-2.5 ${connected ? 'bg-green-400 animate-blink' : 'bg-red-400'}`} aria-label={connected ? 'Сокет подключён' : 'Отключено'} />
        </div>
        <ul className="scrollbar-pixel max-h-96 overflow-y-auto">
          {rooms.length === 0 ? (
            <li className="px-4 py-8 text-center text-xs text-muted-foreground">Пока никто не написал — виджет чата уже на сайте</li>
          ) : null}
          {rooms.map((room) => (
            <li key={room.id}>
              <button
                type="button"
                onClick={() => selectRoom(room.id)}
                className={`flex w-full items-center gap-2 px-4 py-3 text-left transition-colors ${
                  activeRoom === room.id ? 'bg-purple-500/20' : 'hover:bg-purple-500/10'
                }`}
              >
                <span className="rounded-xl grid h-8 w-8 shrink-0 place-items-center bg-black/40 font-display text-[10px] text-purple-200">
                  {(room.userName || 'Г').slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">{room.userName || 'Гость'}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{room.lastText || '…'}</span>
                </span>
                {room.unread > 0 ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white">
                    {room.unread}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl flex min-h-96 flex-col border border-purple-500/25 bg-card/70">
        {!activeRoom ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <span className="font-display text-4xl text-purple-500/50 animate-blink">▚▞▚</span>
            <p className="text-sm text-muted-foreground">Выбери диалог слева и ответь покупателю</p>
            {!connected ? <Loader2 className="h-5 w-5 animate-spin text-purple-400" aria-label="Подключение" /> : null}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-purple-500/25 px-4 py-3">
              <div>
                <p className="font-display text-sm text-white">{activeRoomInfo?.userName || 'Гость'}</p>
                <p className="text-[11px] text-muted-foreground">room: {activeRoom}</p>
              </div>
              <span className="text-[11px] text-muted-foreground">{connected ? 'онлайн' : 'офлайн'}</span>
            </div>

            <div ref={scrollRef} className="scrollbar-pixel flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.from === 'support' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`rounded-xl max-w-[75%] px-3 py-2 text-sm ${
                      message.from === 'support'
                        ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white'
                        : 'border border-purple-500/30 bg-purple-500/10 text-purple-100'
                    }`}
                  >
                    {message.text}
                    <span className="ml-2 align-bottom text-[10px] text-white/50">
                      {new Date(message.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {typingWho === 'user' ? (
                <div className="flex justify-start">
                  <span className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs text-purple-200">
                    гость печатает<span className="animate-blink">…</span>
                  </span>
                </div>
              ) : null}
            </div>

            <form onSubmit={send} className="flex gap-2 border-t border-purple-500/25 p-3">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ответ покупателю…"
                maxLength={1000}
                className="h-10 flex-1 rounded-md border border-purple-500/30 bg-[#0d0c1c] px-3 text-sm text-white placeholder:text-purple-300/40 focus:outline-none focus:ring-1 focus:ring-orange-500"
                aria-label="Ответ покупателю"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="rounded-xl grid h-10 w-10 place-items-center bg-gradient-to-br from-orange-500 to-purple-600 text-white disabled:opacity-40"
                aria-label="Отправить ответ"
              >
                <SendHorizonal className="h-4 w-4" aria-hidden />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default AdminChat
