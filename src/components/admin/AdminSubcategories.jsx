'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, GitBranch, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useInfiniteList from '@/hooks/useInfiniteList'
import { styleGradient } from '@/lib/constants'
import GlassButton from '@/components/motion/GlassButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

// Подкатегории товаров в админке: карточки + подгрузка по скроллу по 25 записей.
// Создание и редактирование — прямо на странице, без модалок.

const EMPTY_SUBCATEGORY = { name: '', slug: '', categoryId: '', sort: 0 }

const SubcategoryFields = ({ form, setField, categories }) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <div className="space-y-1">
      <Label className="text-xs text-purple-200">Название *</Label>
      <Input required value={form.name} onChange={setField('name')} placeholder="Hoodies & Sweats" className="border-purple-500/30 bg-[#0d0c1c]" />
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-purple-200">Slug (URL)</Label>
      <Input value={form.slug} onChange={setField('slug')} placeholder="auto из названия" className="border-purple-500/30 bg-[#0d0c1c]" />
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-purple-200">Категория *</Label>
      <Select value={String(form.categoryId)} onValueChange={setField('categoryId')}>
        <SelectTrigger className="border-purple-500/30 bg-[#0d0c1c]">
          <SelectValue placeholder="Выбери категорию" />
        </SelectTrigger>
        <SelectContent className="border-purple-500/30 bg-[#10101f]">
          {categories.map((category) => (
            <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-purple-200">Порядок сортировки</Label>
      <Input type="number" min="0" value={form.sort} onChange={setField('sort')} className="border-purple-500/30 bg-[#0d0c1c]" />
    </div>
  </div>
)

const AdminSubcategories = () => {
  const [categories, setCategories] = useState([])
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(EMPTY_SUBCATEGORY)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_SUBCATEGORY)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)

  const buildUrl = (offset, pageSize) => `/api/admin/subcategories?offset=${offset}&limit=${pageSize}`

  const { items, total, loading, loadingMore, sentinelRef, reload } = useInfiniteList({
    buildUrl,
    fetcher: API.admin.get,
    onError: (error) => toast.error('Не удалось загрузить подкатегории', { description: error.message }),
  })

  // Категории для выбора — маленький справочник, грузим целиком один раз
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await API.get('/api/categories')
        if (!cancelled) setCategories(data.categories || [])
      } catch (error) {
        if (!cancelled) toast.error('Категории недоступны', { description: error.message })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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
      const data = await API.admin.post('/api/admin/subcategories', draft)
      toast.success('Подкатегория создана', { description: data.subcategory?.name })
      setDraft(EMPTY_SUBCATEGORY)
      setCreating(false)
      reload()
    } catch (error) {
      toast.error('Ошибка создания', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (subcategory) => {
    setEditingId(subcategory.id)
    setEditForm({
      name: subcategory.name,
      slug: subcategory.slug,
      categoryId: String(subcategory.categoryId),
      sort: subcategory.sort,
    })
  }

  const submitEdit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const data = await API.admin.put(`/api/admin/subcategories/${editingId}`, editForm)
      toast.success('Подкатегория обновлена', { description: data.subcategory?.name })
      setEditingId(null)
      reload()
    } catch (error) {
      toast.error('Ошибка обновления', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await API.admin.del(`/api/admin/subcategories/${deleting.id}`)
      toast.success('Подкатегория удалена', { description: deleting.name })
      setDeleting(null)
      reload()
    } catch (error) {
      toast.error('Не удалось удалить подкатегорию', { description: error.message })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg text-white">Подкатегории товаров ({total})</h2>
        <GlassButton tone="primary" onClick={() => setCreating(!creating)} disabled={!categories.length}>
          {creating ? <X className="mr-2 h-4 w-4" aria-hidden /> : <Plus className="mr-2 h-4 w-4" aria-hidden />}
          {creating ? 'Свернуть форму' : 'Новая подкатегория'}
        </GlassButton>
      </div>

      {!categories.length && !loading ? (
        <p className="glass-panel p-4 text-sm text-muted-foreground">
          Сначала создайте категорию — подкатегории живут внутри категорий.
        </p>
      ) : null}

      {creating ? (
        <form onSubmit={submitDraft} className="glass-panel space-y-4 p-5">
          <p className="font-display text-base font-bold text-white">Новая подкатегория</p>
          <SubcategoryFields form={draft} setField={setDraftField} categories={categories} />
          <div className="flex justify-end">
            <GlassButton type="submit" tone="orange" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Plus className="mr-2 h-4 w-4" aria-hidden />}
              Создать
            </GlassButton>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="glass-card h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((subcategory) => (
              <article key={subcategory.id} className="glass-card p-4">
                {editingId === subcategory.id ? (
                  <form onSubmit={submitEdit} className="space-y-3">
                    <SubcategoryFields form={editForm} setField={setEditField} categories={categories} />
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
                    <span
                      className="h-12 w-12 shrink-0 rounded-xl border border-white/15"
                      style={{ background: styleGradient(subcategory.category?.style ?? 2) }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-bold text-white">{subcategory.name}</p>
                      <p className="truncate text-xs text-muted-foreground">/{subcategory.slug}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                        <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-200">
                          {subcategory.category?.name || '—'}
                        </span>
                        <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-orange-200">
                          {subcategory.count ?? 0} товаров
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEdit(subcategory)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-purple-500/40 text-purple-200 hover:bg-purple-500/15"
                        aria-label={`Редактировать ${subcategory.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(subcategory)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-orange-500/40 text-orange-300 hover:bg-orange-500/15"
                        aria-label={`Удалить ${subcategory.name}`}
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
            <p className="py-3 text-center font-display text-sm font-bold text-purple-300">Загружаем ещё подкатегории…</p>
          ) : null}
          {!items.length ? (
            <div className="glass-panel flex flex-col items-center gap-3 py-14 text-center">
              <GitBranch className="h-10 w-10 text-purple-400/70" aria-hidden />
              <p className="font-display text-lg font-bold text-white">Подкатегорий пока нет</p>
              <p className="text-sm text-muted-foreground">Добавьте первую — она появится в форме товара.</p>
            </div>
          ) : null}
        </>
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => (open ? null : setDeleting(null))}>
        <AlertDialogContent className="border-orange-500/40 bg-[#0a0918]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-orange-300">Удалить подкатегорию?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              «{deleting?.name}» исчезнет. Товары останутся на месте — просто без подкатегории.
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

export default AdminSubcategories
