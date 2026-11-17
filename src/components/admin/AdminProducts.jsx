'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Package } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import { formatPrice } from '@/lib/constants'
import PixelButton from '@/components/motion/PixelButton'
import ProductForm from '@/components/admin/ProductForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'

// Управление товарами: таблица, создание/редактирование, удаление, быстрая публикация

const AdminProducts = ({ categories }) => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await API.admin.get('/api/admin/products')
      setItems(data.items)
    } catch (error) {
      toast.error('Не удалось загрузить товары', { description: error.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (product) => {
    setEditing(product)
    setFormOpen(true)
  }

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
      load()
    } catch (error) {
      toast.error('Ошибка удаления', { description: error.message })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-white">Товары ({items.length})</h2>
        <PixelButton tone="primary" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" aria-hidden /> Новый товар
        </PixelButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-purple-400" aria-label="Загрузка" />
        </div>
      ) : (
        <div className="scrollbar-pixel pixel-corners overflow-x-auto border border-purple-500/25 bg-card/70">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-purple-500/25 text-left text-xs uppercase tracking-wider text-purple-300">
                <th className="px-4 py-3">Товар</th>
                <th className="px-4 py-3">Категория</th>
                <th className="px-4 py-3">Цена</th>
                <th className="px-4 py-3">Склад</th>
                <th className="px-4 py-3">Витрина</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((product) => (
                <tr key={product.id} className="border-b border-purple-500/10 transition-colors hover:bg-purple-500/5">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-sm border border-purple-500/30 bg-purple-500/10">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="h-full w-full object-cover image-pixelated" />
                        ) : (
                          <Package className="m-2.5 h-5 w-5 text-purple-400" aria-hidden />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-display text-purple-100">{product.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {product.slug} {product.label !== 'none' ? `· ${product.label.toUpperCase()}` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-purple-200">{product.category?.name || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-display text-orange-300">{formatPrice(product.price)}</span>
                    {product.oldPrice ? <span className="ml-1.5 text-xs text-muted-foreground line-through">{formatPrice(product.oldPrice)}</span> : null}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={product.stock <= 3 ? 'font-display text-orange-400' : 'text-purple-200'}>{product.stock} шт</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Switch checked={product.published} onCheckedChange={(checked) => togglePublished(product, checked)} aria-label="Опубликован" />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(product)}
                        className="grid h-8 w-8 place-items-center rounded-sm border border-purple-500/40 text-purple-200 hover:bg-purple-500/15"
                        aria-label={`Редактировать ${product.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(product)}
                        className="grid h-8 w-8 place-items-center rounded-sm border border-orange-500/40 text-orange-300 hover:bg-orange-500/15"
                        aria-label={`Удалить ${product.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent aria-describedby={undefined} className="max-h-[85vh] max-w-2xl overflow-hidden border-purple-500/30 bg-[#0a0918]">
          <DialogHeader>
            <DialogTitle className="font-display text-purple-200">
              {editing ? 'Редактирование товара' : 'Новый товар'}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editing}
            categories={categories}
            onCancel={() => setFormOpen(false)}
            onSaved={() => {
              setFormOpen(false)
              load()
            }}
          />
        </DialogContent>
      </Dialog>

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
