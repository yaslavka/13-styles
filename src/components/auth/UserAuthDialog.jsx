'use client'

import { useState } from 'react'
import { Loader2, LogIn, UserPlus, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useAuth from '@/store/useAuth'
import useT from '@/hooks/useT'
import GlassButton from '@/components/motion/GlassButton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Форма авторизации и регистрации покупателей 13 STYLES (единый диалог, два таба)

const UserAuthDialog = () => {
  const authOpen = useAuth((state) => state.authOpen)
  const setAuthOpen = useAuth((state) => state.setAuthOpen)
  const setUser = useAuth((state) => state.setUser)
  const t = useT()

  const [mode, setMode] = useState('login')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setLogin('')
    setPassword('')
    setName('')
    setMode('login')
  }

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      const payload = { login: login.trim(), password }
      const data = mode === 'register' ? await API.user.register({ ...payload, name: name.trim() }) : await API.user.login(payload)
      setUser(data.user)
      setAuthOpen(false)
      reset()
      toast.success(mode === 'register' ? t('auth.registerDone') : t('auth.loginDone'), {
        description: data.user?.name,
      })
    } catch (error) {
      toast.error(t('auth.error'), { description: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={authOpen} onOpenChange={setAuthOpen}>
      <DialogContent aria-describedby={undefined} className="max-w-sm rounded-3xl border-purple-500/30 bg-[#0a0918]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-purple-100">
            <UserRound className="h-5 w-5 text-orange-300" aria-hidden />
            {t('auth.title')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{t('auth.subtitle')}</DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={setMode} className="gap-4">
          <TabsList className="grid w-full grid-cols-2 border border-purple-500/30 bg-[#12102a]">
            <TabsTrigger value="login" className="gap-1.5 font-display">
              <LogIn className="h-3.5 w-3.5" aria-hidden /> {t('auth.loginTab')}
            </TabsTrigger>
            <TabsTrigger value="register" className="gap-1.5 font-display">
              <UserPlus className="h-3.5 w-3.5" aria-hidden /> {t('auth.registerTab')}
            </TabsTrigger>
          </TabsList>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' ? (
              <div className="space-y-1.5 text-left">
                <Label htmlFor="user-name" className="text-xs text-purple-200">{t('auth.name')}</Label>
                <Input
                  id="user-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('auth.namePh')}
                  maxLength={80}
                  autoComplete="name"
                />
              </div>
            ) : null}

            <div className="space-y-1.5 text-left">
              <Label htmlFor="user-login" className="text-xs text-purple-200">{t('auth.login')}</Label>
              <Input
                id="user-login"
                required
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder={t('auth.loginPh')}
                maxLength={40}
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="user-password" className="text-xs text-purple-200">{t('auth.password')}</Label>
              <Input
                id="user-password"
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('auth.passwordPh')}
                maxLength={100}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </div>

            {mode === 'login' ? <p className="text-xs text-muted-foreground">{t('auth.noAccount')}</p> : null}

            <GlassButton type="submit" tone="primary" className="h-11 w-full" disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              {mode === 'register' ? t('auth.registerBtn') : t('auth.loginBtn')}
            </GlassButton>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default UserAuthDialog
