'use client'

import { useEffect, useState } from 'react'
import { Lock, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import GlassButton from '@/components/motion/GlassButton'
import GradientText from '@/components/motion/GradientText'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Вход в админ-панель по паролю (ADMIN_PASSWORD, по умолчанию 13styles2024)

const AdminGate = ({ onAuthed }) => {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      await API.admin.login(password)
      toast.success('Доступ открыт', { description: 'Добро пожаловать в админку 13 STYLES' })
      onAuthed()
    } catch (error) {
      toast.error('Ошибка входа', { description: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <span className="rounded-2xl grid h-16 w-16 place-items-center bg-gradient-to-br from-purple-600 to-orange-500 shadow-[0_0_30px_rgba(139,92,246,0.5)]">
        <Lock className="h-7 w-7 text-white" aria-hidden />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold sm:text-3xl">
        <GradientText styleIndex={4}>АДМИН-ПАНЕЛЬ</GradientText>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Управление товарами, заказами и чатом поддержки 13 STYLES.
      </p>

      <form onSubmit={submit} className="rounded-2xl mt-7 w-full space-y-4 border border-purple-500/25 bg-card/70 p-5 backdrop-blur-sm">
        <div className="space-y-1.5 text-left">
          <Label htmlFor="admin-password" className="text-xs text-purple-200">Пароль администратора</Label>
          <Input
            id="admin-password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="13styles2024"
            className="border-purple-500/30 bg-[#0d0c1c]"
            autoComplete="current-password"
          />
        </div>
        <GlassButton type="submit" tone="primary" className="h-11 w-full" disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="mr-2 h-4 w-4" aria-hidden />}
          Войти
        </GlassButton>
      </form>
    </div>
  )
}

// Обёртка: проверяет сохранённый токен и показывает панель либо ворота
const AdminAuth = ({ children }) => {
  const [authed, setAuthed] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const verify = async () => {
      if (!API.admin.hasToken()) {
        setChecked(true)
        return
      }
      try {
        await API.admin.get('/api/admin/stats')
        setAuthed(true)
      } catch {
        API.admin.clearToken()
        setAuthed(false)
      } finally {
        setChecked(true)
      }
    }
    verify()
  }, [])

  if (!checked) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" aria-label="Проверка доступа" />
      </div>
    )
  }

  if (!authed) return <AdminGate onAuthed={() => setAuthed(true)} />

  return children
}

export default AdminAuth
