'use client'

import { useEffect, useState } from 'react'
import { Package, ShoppingCart, Wallet, Flame, TrendingUp } from 'lucide-react'
import API from '@/lib/api'
import { formatPrice, styleGradient, ORDER_STATUSES } from '@/lib/constants'
import Reveal from '@/components/motion/Reveal'
import { StatSkeleton } from '@/components/ui/card-skeleton'

// Обзор: ключевые метрики, малый остаток, последние заказы, распределение по категориям

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="rounded-2xl relative overflow-hidden border border-purple-500/25 bg-card/70 p-4 backdrop-blur-sm">
    <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: tone }} aria-hidden />
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Icon className="h-4 w-4" style={{ color: tone }} aria-hidden />
    </div>
    <p className="mt-2 font-display text-2xl font-bold text-white">{value}</p>
  </div>
)

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await API.admin.get('/api/admin/stats')
        if (!cancelled) setStats(data.stats)
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <p className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-6 text-sm text-orange-200">{error}</p>
  }

  if (!stats) {
    return (
      <div className="space-y-6" aria-hidden>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatSkeleton key={index} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-purple-500/25 bg-card/70 p-4">
            <StatSkeleton />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-9 rounded-sm bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-purple-500/25 bg-card/70 p-4">
            <StatSkeleton />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-9 rounded-sm bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const maxCategoryCount = Math.max(1, ...stats.categoryCounts.map((item) => item.count))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Reveal><StatCard icon={Package} label="Товаров" value={stats.products} tone="#8b5cf6" /></Reveal>
        <Reveal delay={0.05}><StatCard icon={Flame} label="На витрине" value={stats.published} tone="#f97316" /></Reveal>
        <Reveal delay={0.1}><StatCard icon={ShoppingCart} label="Заказов" value={stats.orders} tone="#3b82f6" /></Reveal>
        <Reveal delay={0.15}><StatCard icon={Wallet} label="Выручка" value={formatPrice(stats.revenue || 0)} tone="#c4b5fd" /></Reveal>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-purple-500/25 bg-card/70 p-4">
          <h3 className="font-display text-base text-white">Новые заказы: {stats.newOrders}</h3>
          <ul className="scrollbar-pixel mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
            {stats.recentOrders.map((order) => {
              const status = ORDER_STATUSES.find((item) => item.value === order.status)
              return (
                <li key={order.id} className="flex items-center justify-between gap-2 rounded-sm bg-purple-500/5 px-3 py-2 text-sm">
                  <span className="font-display text-purple-200">{order.code}</span>
                  <span className="truncate text-xs text-muted-foreground">{order.customer}</span>
                  <span className="font-display text-xs text-orange-300">{formatPrice(order.total)}</span>
                  <span className="rounded-xl px-2 py-0.5 text-[11px]" style={{ background: `${status?.tone || '#8b5cf6'}22`, color: status?.tone || '#8b5cf6' }}>
                    {status?.name || order.status}
                  </span>
                </li>
              )
            })}
            {!stats.recentOrders.length ? <li className="py-6 text-center text-sm text-muted-foreground">Заказов пока нет</li> : null}
          </ul>
        </div>

        <div className="rounded-2xl border border-purple-500/25 bg-card/70 p-4">
          <h3 className="font-display text-base text-white">Товары по категориям</h3>
          <ul className="mt-3 space-y-2.5">
            {stats.categoryCounts.map((item) => (
              <li key={item.slug}>
                <div className="flex justify-between text-xs">
                  <span className="text-purple-200">{item.name}</span>
                  <span className="text-muted-foreground">{item.count}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-sm bg-purple-500/10">
                  <div
                    className="h-full transition-all duration-700"
                    style={{ width: `${(item.count / maxCategoryCount) * 100}%`, background: styleGradient(item.style) }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-purple-500/25 bg-card/70 p-4">
          <h3 className="font-display text-base text-white">Заканчивается на складе</h3>
          <ul className="mt-3 space-y-2">
            {stats.lowStock.map((product) => (
              <li key={product.id} className="flex items-center gap-3 rounded-sm bg-orange-500/5 px-3 py-2 text-sm">
                <TrendingUp className="h-4 w-4 text-orange-400" aria-hidden />
                <span className="truncate flex-1 text-purple-100">{product.name}</span>
                <span className="font-display text-xs text-orange-300">{product.stock} шт</span>
              </li>
            ))}
            {!stats.lowStock.length ? <li className="py-4 text-center text-sm text-muted-foreground">Все позиции в достатке</li> : null}
          </ul>
        </div>

        <div className="rounded-2xl border border-purple-500/25 bg-card/70 p-4">
          <h3 className="font-display text-base text-white">Топ рейтинга</h3>
          <ul className="mt-3 space-y-2">
            {stats.topProducts.map((product) => (
              <li key={product.id} className="flex items-center gap-3 rounded-sm bg-purple-500/5 px-3 py-2 text-sm">
                <span className="truncate flex-1 text-purple-100">{product.name}</span>
                <span className="font-display text-xs text-purple-300">★ {product.rating.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
