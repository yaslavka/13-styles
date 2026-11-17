'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import { formatPrice, ORDER_STATUSES, styleGradient } from '@/lib/constants'

// Заказы: список, состав заказа, смена статуса

const AdminOrders = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await API.admin.get('/api/admin/orders')
      setItems(data.items)
    } catch (error) {
      toast.error('Не удалось загрузить заказы', { description: error.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

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
      <h2 className="font-display text-lg text-white">Заказы ({items.length})</h2>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-purple-400" aria-label="Загрузка" />
        </div>
      ) : !items.length ? (
        <p className="pixel-corners border border-purple-500/25 bg-card/70 p-8 text-center text-sm text-muted-foreground">
          Заказов пока нет — как только покупатель оформит первый, он появится здесь
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((order) => {
            const status = ORDER_STATUSES.find((item) => item.value === order.status)
            const isOpen = expanded === order.id
            return (
              <div key={order.id} className="pixel-corners border border-purple-500/25 bg-card/70">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : order.id)}
                    className="grid h-7 w-7 place-items-center text-purple-300 hover:text-white"
                    aria-label={isOpen ? 'Свернуть состав заказа' : 'Показать состав заказа'}
                  >
                    {isOpen ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                  </button>
                  <div className="min-w-32">
                    <p className="font-display text-sm text-purple-100">{order.code}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="min-w-40 flex-1">
                    <p className="truncate text-sm text-white">{order.customer}</p>
                    <p className="text-[11px] text-muted-foreground">{order.phone} · {order.address}</p>
                  </div>
                  <span className="font-display text-orange-300">{formatPrice(order.total)}</span>
                  <span className="pixel-corners-sm px-2 py-0.5 text-[11px]" style={{ background: `${status?.tone || '#8b5cf6'}22`, color: status?.tone || '#8b5cf6' }}>
                    {status?.name || order.status}
                  </span>
                  <select
                    value={order.status}
                    onChange={(event) => changeStatus(order, event.target.value)}
                    className="h-8 rounded-sm border border-purple-500/40 bg-[#0d0c1c] px-2 text-xs text-purple-100"
                    aria-label="Статус заказа"
                  >
                    {ORDER_STATUSES.map((item) => (
                      <option key={item.value} value={item.value}>{item.name}</option>
                    ))}
                  </select>
                </div>

                {isOpen ? (
                  <div className="border-t border-purple-500/20 px-4 py-3">
                    {order.comment ? <p className="mb-2 text-xs text-orange-200">Комментарий: {order.comment}</p> : null}
                    <ul className="space-y-2">
                      {order.items.map((item, index) => (
                        <li key={`${order.id}-${index}`} className="flex items-center gap-3 text-sm">
                          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-sm" style={{ background: styleGradient(2) }}>
                            {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover image-pixelated" /> : null}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-purple-100">{item.name}</span>
                          {item.size ? <span className="text-xs text-muted-foreground">р-р {item.size}</span> : null}
                          <span className="text-xs text-muted-foreground">{item.qty} × {formatPrice(item.price)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AdminOrders
