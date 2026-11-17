'use client'

import { useState } from 'react'
import { Users, Pencil, Trash2, Ban, ShieldOff, KeyRound, UserRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useInfiniteList from '@/hooks/useInfiniteList'
import GlassButton from '@/components/motion/GlassButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { AdminCardSkeleton } from '@/components/ui/card-skeleton'

// Пользователи в админке: карточки (не таблица), подгрузка по скроллу по 25 записей.
// Всё, что можно сделать с пользователем: редактирование данных (имя, логин, пароль),
// блокировка входа (blocked), бан (banned), удаление аккаунта.

const AdminUsers = () => {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', login: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [toggling, setToggling] = useState(null)

  const buildUrl = (offset, pageSize) => `/api/admin/users?offset=${offset}&limit=${pageSize}`

  const { items, total, loading, loadingMore, sentinelRef, setItems } = useInfiniteList({
    buildUrl,
    fetcher: API.admin.get,
    onError: (error) => toast.error('Не удалось загрузить пользователей', { description: error.message }),
  })

  const patchUser = async (user, data, successText) => {
    setToggling(user.id)
    try {
      const res = await API.admin.put(`/api/admin/users/${user.id}`, data)
      setItems((prev) => prev.map((item) => (item.id === user.id ? { ...item, ...res.user } : item)))
      toast.success(successText, { description: res.user.login })
    } catch (error) {
      toast.error('Ошибка', { description: error.message })
    } finally {
      setToggling(null)
    }
  }

  const startEdit = (user) => {
    setEditingId(user.id)
    setEditForm({ name: user.name, login: user.login, password: '' })
  }

  const submitEdit = async (event) => {
    event.preventDefault()
    if (!editingId) return
    setSaving(true)
    try {
      const payload = { name: editForm.name, login: editForm.login }
      if (editForm.password) payload.password = editForm.password
      const res = await API.admin.put(`/api/admin/users/${editingId}`, payload)
      setItems((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...res.user } : item)))
      toast.success('Пользователь обновлён', { description: res.user.login })
      setEditingId(null)
    } catch (error) {
      toast.error('Ошибка сохранения', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await API.admin.del(`/api/admin/users/${deleting.id}`)
      toast.success('Пользователь удалён', { description: deleting.login })
      setDeleting(null)
      setItems((prev) => prev.filter((item) => item.id !== deleting.id))
    } catch (error) {
      toast.error('Ошибка удаления', { description: error.message })
    }
  }

  const statusBadge = (user) => {
    if (user.banned) {
      return <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">забанен</span>
    }
    if (user.blocked) {
      return <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-300">заблокирован</span>
    }
    return <span className="rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-300">активен</span>
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg text-white">Пользователи ({total})</h2>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }).map((_, index) => (
            <AdminCardSkeleton key={index} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="glass-panel flex flex-col items-center gap-3 py-16 text-center">
          <Users className="h-10 w-10 text-purple-400/70" aria-hidden />
          <p className="font-display text-lg font-bold text-white">Пользователей пока нет</p>
          <p className="text-sm text-muted-foreground">Как только покупатель зарегистрируется, его карточка появится здесь.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((user) => {
              const isEditing = editingId === user.id
              return (
                <article key={user.id} className="glass-card p-4">
                  {isEditing ? (
                    <form onSubmit={submitEdit} className="space-y-3">
                      <p className="font-display text-sm font-bold text-purple-200">Редактирование #{user.id}</p>
                      <div className="space-y-1">
                        <Label className="text-xs text-purple-200">Имя</Label>
                        <Input value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} maxLength={80} className="border-purple-500/30 bg-[#0d0c1c]" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-purple-200">Логин</Label>
                        <Input required value={editForm.login} onChange={(event) => setEditForm((prev) => ({ ...prev, login: event.target.value }))} maxLength={40} className="border-purple-500/30 bg-[#0d0c1c]" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-purple-200">Новый пароль (пусто = не менять)</Label>
                        <Input type="password" value={editForm.password} onChange={(event) => setEditForm((prev) => ({ ...prev, password: event.target.value }))} placeholder="••••••••" autoComplete="new-password" className="border-purple-500/30 bg-[#0d0c1c]" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <GlassButton type="button" tone="ghost" onClick={() => setEditingId(null)}>Отмена</GlassButton>
                        <GlassButton type="submit" tone="primary" disabled={saving}>
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                          Сохранить
                        </GlassButton>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="glass-btn glass-btn-primary grid h-11 w-11 shrink-0 place-items-center rounded-2xl">
                            <UserRound className="h-5 w-5 text-white" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-display text-sm font-bold text-white" title={user.name}>{user.name || '—'}</p>
                            <p className="truncate text-xs text-muted-foreground">@{user.login}</p>
                          </div>
                        </div>
                        {statusBadge(user)}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
                        <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-purple-200">
                          {user.orderCount ?? 0} заказов
                        </span>
                        <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-muted-foreground">
                          ID #{user.id}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 border-t border-purple-500/20 pt-3">
                        <label className="flex items-center justify-between gap-2 text-xs font-bold text-purple-200">
                          <span className="flex items-center gap-1.5">
                            <ShieldOff className="h-3.5 w-3.5 text-orange-300" aria-hidden /> Блокировка входа
                          </span>
                          <Switch
                            checked={user.blocked}
                            disabled={toggling === user.id}
                            onCheckedChange={(checked) => patchUser(user, { blocked: checked }, checked ? 'Пользователь заблокирован' : 'Блокировка снята')}
                            aria-label={`Блокировка: ${user.login}`}
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2 text-xs font-bold text-purple-200">
                          <span className="flex items-center gap-1.5">
                            <Ban className="h-3.5 w-3.5 text-red-400" aria-hidden /> Бан аккаунта
                          </span>
                          <Switch
                            checked={user.banned}
                            disabled={toggling === user.id}
                            onCheckedChange={(checked) => patchUser(user, { banned: checked }, checked ? 'Аккаунт забанен' : 'Бан снят')}
                            aria-label={`Бан: ${user.login}`}
                          />
                        </label>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(user)}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-purple-500/40 text-purple-200 hover:bg-purple-500/15"
                            aria-label={`Редактировать ${user.login}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => patchUser(user, { password: `${user.login}-${Math.random().toString(36).slice(2, 8)}` }, 'Пароль сброшен')}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-blue-500/40 text-blue-300 hover:bg-blue-500/15"
                            aria-label={`Сбросить пароль ${user.login}`}
                            title="Сбросить пароль (сгенерировать новый)"
                          >
                            <KeyRound className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(user)}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-orange-500/40 text-orange-300 hover:bg-orange-500/15"
                            aria-label={`Удалить ${user.login}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </article>
              )
            })}
          </div>

          <div ref={sentinelRef} className="h-2" aria-hidden />
          {loadingMore ? (
            <p className="py-3 text-center font-display text-sm font-bold text-purple-300">Загружаем ещё пользователей…</p>
          ) : null}
        </>
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => (open ? null : setDeleting(null))}>
        <AlertDialogContent className="border-orange-500/40 bg-[#0a0918]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-orange-300">Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Аккаунт «{deleting?.login}» исчезнет навсегда вместе со способами оплаты. Его заказы останутся в списке заказов.
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

export default AdminUsers
