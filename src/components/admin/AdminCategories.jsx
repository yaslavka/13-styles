'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Shapes, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useInfiniteList from '@/hooks/useInfiniteList'
import { styleGradient } from '@/lib/constants'
import GlassButton from '@/components/motion/GlassButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { AdminCardSkeleton } from '@/components/ui/card-skeleton'

// Категории товаров в админке: карточки + подгрузка по скроллу по 25 записей.
// Создание и редактирование — прямо на странице, без модалок.

const MAX_STYLES = 12

const EMPTY_CATEGORY = { name: '', slug: '', subtitle: '', icon: 'Shirt', style: 2, sort: 0 }

const CategoryFields = ({ form, setField }) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <div className="space-y-1">
      <Label className="text-xs text-purple-200">Название *</Label>
      <Input required value={form.name} onChange={setField('name')} placeholder="Мужская одежда" className="border-purple-500/30 bg-[#0d0c1c]" />
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-purple-200">Slug (URL)</Label>
      <Input value={form.slug} onChange={setField('slug')} placeholder="auto из названия" className="border-purple-500/30 bg-[#0d0c1c]" />
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-purple-200">Подзаголовок</Label>
      <Input value={form.subtitle} onChange={setField('subtitle')} placeholder="Streetwear для 16–50" className="border-purple-500/30 bg-[#0d0c1c]" />
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-purple-200">Иконка (Lucide)</Label>
      <Input value={form.icon} onChange={setField('icon')} placeholder="Shirt" className="border-purple-500/30 bg-[#0d0c1c]" />
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-purple-200">Градиент-стиль (0–{MAX_STYLES})</Label>
      <Input type="number" min="0" max={MAX_STYLES} value={form.style} onChange={setField('style')} className="border-purple-500/30 bg-[#0d0c1c]" />
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-purple-200">Порядок сортировки</Label>
      <Input type="number" min="0" value={form.sort} onChange={setField('sort')} className="border-purple-500/30 bg-[#0d0c1c]" />
    </div>
  </div>
)

const AdminCategories = () => {
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(EMPTY_CATEGORY)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_CATEGORY)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)

  const buildUrl = (offset, pageSize) => `/api/admin/categories?offset=${offset}&limit=${pageSize}`

  const { items, total, loading, loadingMore, sentinelRef, reload, setItems } = useInfiniteList({
    buildUrl,
    fetcher: API.admin.get,
    onError: (error) => toast.error('Не удалось загрузить категории', { description: error.message }),
  })

  const setDraftField = (field) => (eventOrValue) => {
    const value = eventOrValue?.target ? eventOrValue.target.value : eventOrValue
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  const setEditField = (field) => (eventOrValue) => {
    const value = eventOrValue?.target ? eventOrValue.target.value : eventOrValue
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const submitDraft = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const data = await API.admin.post('/api/admin/categories', draft)
      toast.success('Категория создана', { description: data.category?.name })
      setDraft(EMPTY_CATEGORY)
      setCreating(false)
      reload()
    } catch (error) {
      toast.error('Ошибка создания', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (category) => {
    setEditingId(category.id)
    setEditForm({
      name: category.name,
      slug: category.slug,
      subtitle: category.subtitle,
      icon: category.icon,
      style: category.style,
      sort: category.sort,
    })
  }

  const submitEdit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const data = await API.admin.put(`/api/admin/categories/${editingId}`, editForm)
      setItems((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...data.category } : item)))
      toast.success('Категория обновлена', { description: data.category?.name })
      setEditingId(null)
    } catch (error) {
      toast.error('Ошибка обновления', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await API.admin.del(`/api/admin/categories/${deleting.id}`)
      toast.success('Категория удалена', { description: deleting.name })
      setDeleting(null)
      reload()
    } catch (error) {
      toast.error('Не удалось удалить категорию', { description: error.message })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg text-white">Категории товаров ({total})</h2>
        <GlassButton tone="primary" onClick={() => setCreating(!creating)}>
          {creating ? <X className="mr-2 h-4 w-4" aria-hidden /> : <Plus className="mr-2 h-4 w-4" aria-hidden />}
          {creating ? 'Свернуть форму' : 'Новая категория'}
        </GlassButton>
      </div>

      {creating ? (
        <form onSubmit={submitDraft} className="glass-panel space-y-4 p-5">
          <p className="font-display text-base font-bold text-white">Новая категория каталога</p>
          <CategoryFields form={draft} setField={setDraftField} />
          <div className="flex justify-end">
            <GlassButton type="submit" tone="orange" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Plus className="mr-2 h-4 w-4" aria-hidden />}
              Создать
            </GlassButton>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 4 }).map((_, index) => (
            <AdminCardSkeleton key={index} className="h-36" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((category) => (
              <article key={category.id} className="glass-card p-4">
                {editingId === category.id ? (
                  <form onSubmit={submitEdit} className="space-y-3">
                    <CategoryFields form={editForm} setField={setEditField} />
                    <div className="flex justify-end gap-2">
                      <GlassButton type="button" tone="ghost" onClick={() => setEditingId(null)}>Отмена</GlassButton>
                      <GlassButton type="submit" tone="primary" disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                        Сохранить
                      </GlassButton>
                    </div>
                  </form>
                ) : (
                  <div className="flex gap-3">
                    <span className="h-14 w-14 shrink-0 rounded-xl border border-white/15" style={{ background: styleGradient(category.style) }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-bold text-white">{category.name}</p>
                      <p className="truncate text-xs text-muted-foreground">/{category.slug}</p>
                      {category.subtitle ? <p className="mt-1 line-clamp-2 text-xs text-purple-200/80">{category.subtitle}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                        <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-200">{category.count} товаров</span>
                        <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-orange-200">{category.subcategoryCount} подкатегорий</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEdit(category)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-purple-500/40 text-purple-200 hover:bg-purple-500/15"
                        aria-label={`Редактировать ${category.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(category)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-orange-500/40 text-orange-300 hover:bg-orange-500/15"
                        aria-label={`Удалить ${category.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>

          <div ref={sentinelRef} className="h-2" aria-hidden />
          {loadingMore ? (
            <p className="py-3 text-center font-display text-sm font-bold text-purple-300">Загружаем ещё категории…</p>
          ) : null}
          {!items.length ? (
            <div className="glass-panel flex flex-col items-center gap-3 py-14 text-center">
              <Shapes className="h-10 w-10 text-purple-400/70" aria-hidden />
              <p className="font-display text-lg font-bold text-white">Категорий пока нет</p>
              <p className="text-sm text-muted-foreground">Создайте первую категорию — без неё нельзя добавить товар.</p>
            </div>
          ) : null}
        </>
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => (open ? null : setDeleting(null))}>
        <AlertDialogContent className="border-orange-500/40 bg-[#0a0918]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-orange-300">Удалить категорию?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              «{deleting?.name}» и её подкатегории исчезнут. Категорию с товарами удалить нельзя — сначала перенесите товары.
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

export default AdminCategories
