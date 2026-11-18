'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Package, EyeOff, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useShop from '@/store/useShop'
import useInfiniteList from '@/hooks/useInfiniteList'
import useT from '@/hooks/useT'
import { formatPrice, styleGradient } from '@/lib/constants'
import GlassButton from '@/components/motion/GlassButton'
import SmartImage from '@/components/product/SmartImage'
import { Switch } from '@/components/ui/switch'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { AdminCardSkeleton } from '@/components/ui/card-skeleton'

// Товары админки: карточки (не таблица), подгрузка по скроллу по 25 записей.
// Товар «нет в наличии» остаётся в списке, декор помечается бейджем, товар со
// собственной ссылкой оплаты — бейджем «своя оплата».

const AdminProducts = () => {
  const navigate = useShop((state) => state.navigate)
  const t = useT()
  const [deleting, setDeleting] = useState(null)

  const buildUrl = (offset, pageSize) => `/api/admin/products?offset=${offset}&limit=${pageSize}`

  const { items, total, loading, loadingMore, sentinelRef, reload, setItems } = useInfiniteList({
    buildUrl,
    fetcher: API.admin.get,
    onError: (error) => toast.error('Не удалось загрузить товары', { description: error.message }),
  })

  const togglePublished = async (product, published) => {
    try {
      await API.admin.put(`/api/admin/products/${product.id}`, { published })
      setItems((prev) => prev.map((item) => (item.id === product.id ? { ...item, published } : item)))
      toast.success(published ? 'Товар на витрине' : 'Товар скрыт', { description: product.name })
    } catch (error) {
      toast.error('Ошибка', { description: error.message })
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await API.admin.del(`/api/admin/products/${deleting.id}`)
      toast.success('Товар удалён', { description: deleting.name })
      setDeleting(null)
      reload()
    } catch (error) {
      toast.error('Ошибка удаления', { description: error.message })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg text-white">Товары ({total})</h2>
        <GlassButton tone="primary" onClick={() => navigate('admin', { slug: 'product-new' })}>
          <Plus className="mr-2 h-4 w-4" aria-hidden /> Добавить товар
        </GlassButton>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }).map((_, index) => (
            <AdminCardSkeleton key={index} />
          ))}
        </div>
      ) : !items.length ? (
        <div className="glass-panel flex flex-col items-center gap-3 py-16 text-center">
          <Package className="h-10 w-10 text-purple-400/70" aria-hidden />
          <p className="font-display text-lg font-bold text-white">Товаров пока нет</p>
          <p className="text-sm text-muted-foreground">Добавьте первый товар — он появится на витрине сразу после публикации.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((product) => {
              const soldOut = (product.stock ?? 0) <= 0
              return (
                <article key={product.id} className="glass-card flex gap-3 p-3">
                  <span className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-purple-500/30" style={{ background: styleGradient(product.category?.style ?? 2) }}>
                    {product.images?.[0] ? (
                      <SmartImage src={product.images[0]} alt="" spinner="sm" className="h-full w-full object-cover image-pixelated" />
                    ) : (
                      <Package className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-white/70" aria-hidden />
                    )}
                    {!product.published ? (
                      <span className="absolute inset-0 grid place-items-center bg-black/65" aria-hidden>
                        <EyeOff className="h-5 w-5 text-orange-300" />
                      </span>
                    ) : null}
                    {soldOut ? (
                      <span className="absolute inset-x-1 bottom-1 rounded-md bg-red-950/85 px-1.5 py-0.5 text-center text-[10px] font-bold text-red-300">
                        нет в наличии
                      </span>
                    ) : null}
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate font-display text-sm font-bold text-white" title={product.name}>{product.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground" title={product.slug}>
                      {product.slug}
                      {product.decor ? ' · декор' : ''}
                      {product.subcategory ? ` · ${product.subcategory.name}` : ''}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-purple-300">
                      {product.category?.name || '—'}
                      {product.customPayment ? (
                        <span className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold text-orange-300">
                          <Link2 className="h-3 w-3" aria-hidden /> своя оплата
                        </span>
                      ) : null}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1.5">
                      <span className="font-display text-sm font-bold text-orange-300">
                        {formatPrice(product.price, 'ru')}
                        {product.oldPrice ? <span className="ml-1.5 text-[11px] font-semibold text-muted-foreground line-through">{formatPrice(product.oldPrice, 'ru')}</span> : null}
                      </span>
                      <span className={`text-[11px] font-bold ${soldOut ? 'text-red-400' : 'text-purple-200'}`}>
                        {product.stock} шт
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Switch
                          checked={product.published}
                          onCheckedChange={(checked) => togglePublished(product, checked)}
                          aria-label={`Опубликован: ${product.name}`}
                        />
                        витрина
                      </label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate('admin', { slug: 'product-new', query: { id: String(product.id) } })}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-purple-500/40 text-purple-200 hover:bg-purple-500/15"
                          aria-label={`Редактировать ${product.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(product)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-orange-500/40 text-orange-300 hover:bg-orange-500/15"
                          aria-label={`Удалить ${product.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <div ref={sentinelRef} className="h-2" aria-hidden />
          {loadingMore ? (
            <p className="py-3 text-center font-display text-sm font-bold text-purple-300">Загружаем ещё товары…</p>
          ) : null}
        </>
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => (open ? null : setDeleting(null))}>
        <AlertDialogContent className="border-orange-500/40 bg-[#0a0918]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-orange-300">Удалить товар?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              «{deleting?.name}» исчезнет с витрины навсегда. Заказы с его снимком сохранятся в истории.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-purple-500/40 bg-transparent text-purple-200 hover:bg-purple-500/10 hover:text-white">
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-orange-600 text-white hover:bg-orange-500">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminProducts
