'use client'

import { Skeleton } from '@/components/ui/skeleton'

// Скелет-прелoадеры 13 STYLES: повторяют форму реальных карточек, пока данные
// не пришли с сервера (витрина, админка, личный кабинет)

// Каркас карточки товара на витрине (фото + бейдж + название + описание + цена)
export const ProductCardSkeleton = () => (
  <div className="glass-card overflow-hidden" aria-hidden>
    <div className="relative aspect-square overflow-hidden">
      <Skeleton className="h-full w-full rounded-none bg-white/10" />
      <div className="absolute left-3 top-3 flex gap-1.5">
        <Skeleton className="h-6 w-14 rounded-full bg-white/15" />
        <Skeleton className="h-6 w-12 rounded-full bg-white/10" />
      </div>
    </div>
    <div className="space-y-3 p-4">
      <Skeleton className="h-5 w-3/4 bg-white/10" />
      <Skeleton className="h-3 w-full bg-white/10" />
      <Skeleton className="h-3 w-2/3 bg-white/10" />
      <div className="flex items-center justify-between pt-1.5">
        <Skeleton className="h-7 w-24 bg-white/10" />
        <Skeleton className="h-4 w-16 bg-white/10" />
      </div>
    </div>
  </div>
)

// Каркас горизонтальной строки-карточки в админке (превью + текст + кнопки)
export const AdminCardSkeleton = ({ className = 'h-44' }) => (
  <div className={`glass-card flex gap-3 p-3 ${className}`} aria-hidden>
    <Skeleton className="h-28 w-24 shrink-0 rounded-xl bg-white/10" />
    <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4 bg-white/10" />
        <Skeleton className="h-3 w-1/2 bg-white/10" />
        <Skeleton className="h-3 w-1/3 bg-white/10" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-20 bg-white/10" />
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-8 rounded-lg bg-white/10" />
          <Skeleton className="h-8 w-8 rounded-lg bg-white/10" />
        </div>
      </div>
    </div>
  </div>
)

// Каркас карточки заказа (админка и история заказов)
export const OrderCardSkeleton = () => (
  <div className="glass-card p-4" aria-hidden>
    <div className="flex flex-wrap items-center gap-3">
      <Skeleton className="h-8 w-8 rounded-lg bg-white/10" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32 bg-white/10" />
        <Skeleton className="h-3 w-20 bg-white/10" />
      </div>
      <div className="min-w-36 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/3 bg-white/10" />
        <Skeleton className="h-3 w-1/3 bg-white/10" />
      </div>
      <Skeleton className="h-5 w-20 bg-white/10" />
      <Skeleton className="h-9 w-28 rounded-lg bg-white/10" />
    </div>
  </div>
)

// Каркас плитки статистики на дашборде
export const StatSkeleton = () => (
  <div className="relative overflow-hidden rounded-2xl border border-purple-500/25 bg-card/70 p-4" aria-hidden>
    <div className="flex items-center justify-between">
      <Skeleton className="h-3 w-20 bg-white/10" />
      <Skeleton className="h-4 w-4 rounded bg-white/10" />
    </div>
    <Skeleton className="mt-3 h-8 w-24 bg-white/10" />
  </div>
)

// Каркас формы (админ-форма товара, кабинет)
export const FormSkeleton = ({ rows = 6 }) => (
  <div className="glass-panel space-y-4 p-5 sm:p-6" aria-hidden>
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-24 bg-white/10" />
          <Skeleton className="h-10 w-full rounded-2xl bg-white/10" />
        </div>
      ))}
    </div>
    <Skeleton className="h-24 w-full rounded-2xl bg-white/10" />
  </div>
)

// Сетка каркасов карточек товара (каталог)
export const ProductGridSkeleton = ({ count = 8 }) => (
  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: count }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
)
