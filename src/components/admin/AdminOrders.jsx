'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ReceiptText } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useInfiniteList from '@/hooks/useInfiniteList'
import { formatPrice, ORDER_STATUSES, styleGradient } from '@/lib/constants'
import { OrderCardSkeleton } from '@/components/ui/card-skeleton'

// Заказы админки: карточки (не таблица), состав раскрывается, подгрузка по скроллу по 25 записей

const AdminOrders = () => {
  const [expanded, setExpanded] = useState(null)

  const buildUrl = (offset, pageSize) => `/api/admin/orders?offset=${offset}&limit=${pageSize}`

  const { items, total, loading, loadingMore, sentinelRef, setItems } = useInfiniteList({
    buildUrl,
    fetcher: API.admin.get,
    onError: (error) => toast.error('Не удалось загрузить заказы', { description: error.message }),
  })

  const changeStatus = async (order, status) => {
    try {
      await API.admin.put(`/api/admin/orders/${order.id}`, { status })
      setItems((prev) => prev.map((item) => (item.id === order.id ? { ...item, status } : item)))
      toast.success('Статус обновлён', { description: `${order.code} → ${ORDER_STATUSES.find((s) => s.value === status)?.name}` })
    } catch (error) {
      toast.error('Ошибка', { description: error.message })
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg text-white">Заказы ({total})</h2>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2" aria-hidden>
          {Array.from({ length: 4 }).map((_, index) => (
            <OrderCardSkeleton key={index} />
          ))}
        </div>
      ) : !items.length ? (
        <div className="glass-panel flex flex-col items-center gap-3 py-16 text-center">
          <ReceiptText className="h-10 w-10 text-purple-400/70" aria-hidden />
          <p className="font-display text-lg font-bold text-white">Заказов пока нет</p>
          <p className="text-sm text-muted-foreground">Как только покупатель оформит первый заказ, он появится здесь.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {items.map((order) => {
              const status = ORDER_STATUSES.find((item) => item.value === order.status)
              const isOpen = expanded === order.id
              return (
                <article key={order.id} className="glass-card overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2.5 p-4">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : order.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-purple-500/40 text-purple-300 hover:bg-purple-500/15"
                      aria-label={isOpen ? 'Свернуть состав заказа' : 'Показать состав заказа'}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                    </button>

                    <div className="min-w-28">
                      <p className="font-display text-sm text-purple-100">{order.code}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="min-w-36 flex-1">
                      <p className="truncate text-sm text-white">{order.customer}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{order.phone}</p>
                    </div>

                    <span className="font-display text-sm font-bold text-orange-300">{formatPrice(order.total, 'ru')}</span>
                    <span className="rounded-xl px-2 py-0.5 text-[11px] font-bold" style={{ background: `${status?.tone || '#8b5cf6'}22`, color: status?.tone || '#8b5cf6' }}>
                      {status?.name || order.status}
                    </span>

                    <select
                      value={order.status}
                      onChange={(event) => changeStatus(order, event.target.value)}
                      className="h-9 rounded-lg border border-purple-500/40 bg-[#0d0c1c] px-2 text-xs text-purple-100"
                      aria-label={`Статус заказа ${order.code}`}
                    >
                      {ORDER_STATUSES.map((item) => (
                        <option key={item.value} value={item.value}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  {isOpen ? (
                    <div className="border-t border-purple-500/20 bg-[#0a0918]/60 px-4 py-3">
                      {order.comment ? <p className="mb-2 text-xs text-orange-200">Комментарий: {order.comment}</p> : null}
                      {order.address ? <p className="mb-2 text-xs text-muted-foreground">Адрес: {order.address}</p> : null}
                      <ul className="space-y-2">
                        {order.items.map((item, index) => (
                          <li key={`${order.id}-${index}`} className="flex items-center gap-3 text-sm">
                            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg" style={{ background: styleGradient(2) }}>
                              {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover image-pixelated" /> : null}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-purple-100">{item.name}</span>
                            {item.size ? <span className="text-xs text-muted-foreground">р-р {item.size}</span> : null}
                            <span className="text-xs text-muted-foreground">{item.qty} × {formatPrice(item.price, 'ru')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>

          <div ref={sentinelRef} className="h-2" aria-hidden />
          {loadingMore ? (
            <p className="py-3 text-center font-display text-sm font-bold text-purple-300">Загружаем ещё заказы…</p>
          ) : null}
        </>
      )}
    </div>
  )
}

export default AdminOrders
