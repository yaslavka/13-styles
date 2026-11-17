'use client'

import { useEffect, useState } from 'react'
import { Settings, ReceiptText, CreditCard, Loader2, Plus, Trash2, UserRound, Star, PackageOpen, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useAuth from '@/store/useAuth'
import useShop from '@/store/useShop'
import useT from '@/hooks/useT'
import useInfiniteList from '@/hooks/useInfiniteList'
import { formatPrice, ORDER_STATUSES, styleGradient } from '@/lib/constants'
import GlassButton from '@/components/motion/GlassButton'
import GradientText from '@/components/motion/GradientText'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { OrderCardSkeleton, FormSkeleton } from '@/components/ui/card-skeleton'

// Личный кабинет покупателя: настройки профиля, история заказов,
// привязка/отвязка способов оплаты

const STATUS_FALLBACK_TONE = '#8b5cf6'

const OrdersTab = () => {
  const t = useT()

  const buildUrl = (offset, pageSize) => `/api/auth/orders?offset=${offset}&limit=${pageSize}`

  const { items, total, loading, loadingMore, sentinelRef } = useInfiniteList({
    buildUrl,
    fetcher: API.user.get,
    onError: (error) => toast.error(t('account.ordersError'), { description: error.message }),
  })

  if (loading) {
    return (
      <div className="space-y-3" aria-hidden>
        <OrderCardSkeleton />
        <OrderCardSkeleton />
        <OrderCardSkeleton />
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="glass-panel flex flex-col items-center gap-3 py-14 text-center">
        <PackageOpen className="h-10 w-10 text-purple-400/70" aria-hidden />
        <p className="font-display text-lg font-bold text-white">{t('account.ordersEmpty')}</p>
        <p className="text-sm text-muted-foreground">{t('account.ordersEmptyText')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-muted-foreground">{t('account.ordersCount', { total })}</p>
      <div className="space-y-3">
        {items.map((order) => {
          const status = ORDER_STATUSES.find((item) => item.value === order.status)
          return (
            <article key={order.id} className="glass-card overflow-hidden">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <div className="min-w-32">
                  <p className="font-display text-sm font-bold text-purple-100">{order.code}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </p>
                </div>
                <span className="rounded-xl px-2.5 py-1 text-[11px] font-bold" style={{ background: `${status?.tone || STATUS_FALLBACK_TONE}22`, color: status?.tone || STATUS_FALLBACK_TONE }}>
                  {status ? t(`status.${order.status}`) : order.status}
                </span>
                <span className="ml-auto font-display text-lg font-bold text-orange-300">{formatPrice(order.total)}</span>
              </div>

              <ul className="space-y-2.5 border-t border-purple-500/20 bg-[#0a0918]/50 px-4 py-3">
                {order.items.map((item, index) => (
                  <li key={`${order.id}-${index}`} className="flex items-center gap-3">
                    <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl" style={{ background: styleGradient(2) }}>
                      {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover image-pixelated" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-white">{item.name}</span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {item.qty} × {formatPrice(item.price)} {item.size ? `· ${item.size}` : ''}
                      </span>
                    </span>
                    {item.paidByLink ? (
                      <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                        {t('account.paidByLink')}
                      </span>
                    ) : null}
                    <span className="font-display text-sm font-bold text-orange-300">{formatPrice(item.price * item.qty)}</span>
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
      <div ref={sentinelRef} className="h-2" aria-hidden />
      {loadingMore ? (
        <p className="py-3 text-center font-display text-sm font-bold text-purple-300">{t('catalog.loading')}</p>
      ) : null}
    </div>
  )
}

const PaymentsTab = () => {
  const t = useT()
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState({ label: '', brand: 'card', last4: '', expiry: '' })

  const load = async () => {
    setLoading(true)
    try {
      const data = await API.user.get('/api/auth/payment-methods')
      setMethods(data.items || [])
    } catch (error) {
      toast.error(t('account.paymentsError'), { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const data = await API.user.post('/api/auth/payment-methods', form)
      setMethods((prev) => [...prev, data.method])
      toast.success(t('account.paymentAdded'), { description: data.method.label })
      setForm({ label: '', brand: 'card', last4: '', expiry: '' })
      setAdding(false)
    } catch (error) {
      toast.error(t('account.paymentsError'), { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await API.user.del(`/api/auth/payment-methods/${deleting.id}`)
      setMethods((prev) => prev.filter((item) => item.id !== deleting.id))
      toast.success(t('account.paymentRemoved'), { description: deleting.label })
      setDeleting(null)
      load()
    } catch (error) {
      toast.error(t('account.paymentsError'), { description: error.message })
    }
  }

  const makeDefault = async (method) => {
    try {
      await API.user.put(`/api/auth/payment-methods/${method.id}`, {})
      setMethods((prev) => prev.map((item) => ({ ...item, isDefault: item.id === method.id })))
      toast.success(t('account.paymentDefaultSet'), { description: method.label })
    } catch (error) {
      toast.error(t('account.paymentsError'), { description: error.message })
    }
  }

  const setField = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  if (loading) {
    return <FormSkeleton rows={2} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-muted-foreground">{t('account.paymentsCount', { total: methods.length })}</p>
        <GlassButton tone="primary" onClick={() => setAdding(!adding)}>
          {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Plus className="mr-2 h-4 w-4" aria-hidden />}
          {t('account.paymentAdd')}
        </GlassButton>
      </div>

      {adding ? (
        <form onSubmit={submit} className="glass-panel space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-purple-200">{t('account.paymentLabel')} *</Label>
              <Input required minLength={2} maxLength={60} value={form.label} onChange={setField('label')} placeholder={t('account.paymentLabelPh')} className="rounded-2xl border-white/20 bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-purple-200">{t('account.paymentBrand')}</Label>
              <Input maxLength={20} value={form.brand} onChange={setField('brand')} placeholder="Visa / MasterCard" className="rounded-2xl border-white/20 bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-purple-200">{t('account.paymentLast4')}</Label>
              <Input inputMode="numeric" maxLength={4} value={form.last4} onChange={setField('last4')} placeholder="1234" className="rounded-2xl border-white/20 bg-white/5" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-purple-200">{t('account.paymentExpiry')}</Label>
              <Input maxLength={8} value={form.expiry} onChange={setField('expiry')} placeholder="12/27" className="rounded-2xl border-white/20 bg-white/5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('account.paymentSafety')}</p>
          <div className="flex justify-end gap-2">
            <GlassButton type="button" tone="ghost" onClick={() => setAdding(false)}>{t('account.cancel')}</GlassButton>
            <GlassButton type="submit" tone="primary" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <CreditCard className="mr-2 h-4 w-4" aria-hidden />}
              {t('account.paymentAttach')}
            </GlassButton>
          </div>
        </form>
      ) : null}

      {methods.length === 0 ? (
        <div className="glass-panel flex flex-col items-center gap-3 py-14 text-center">
          <CreditCard className="h-10 w-10 text-purple-400/70" aria-hidden />
          <p className="font-display text-lg font-bold text-white">{t('account.paymentsEmpty')}</p>
          <p className="text-sm text-muted-foreground">{t('account.paymentsEmptyText')}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {methods.map((method) => (
            <article key={method.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="glass-btn glass-btn-primary grid h-10 w-10 shrink-0 place-items-center rounded-2xl">
                    <CreditCard className="h-4 w-4 text-white" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold text-white">{method.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {method.brand}
                      {method.last4 ? ` · •••• ${method.last4}` : ''}
                      {method.expiry ? ` · ${method.expiry}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleting(method)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-orange-500/40 text-orange-300 hover:bg-orange-500/15"
                    aria-label={`${t('account.paymentDetach')}: ${method.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs font-bold text-purple-200">
                <Switch checked={method.isDefault} onCheckedChange={() => makeDefault(method)} aria-label={`${t('account.paymentMakeDefault')}: ${method.label}`} />
                {t('account.paymentMakeDefault')}
                {method.isDefault ? <Star className="h-3.5 w-3.5 fill-orange-400 text-orange-400" aria-hidden /> : null}
              </label>
            </article>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => (open ? null : setDeleting(null))}>
        <AlertDialogContent className="border-orange-500/40 bg-[#0a0918]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-orange-300">{t('account.paymentDetach')}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {deleting?.label} — {t('account.paymentDetachNote')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-purple-500/40 bg-transparent text-purple-200 hover:bg-purple-500/10 hover:text-white">
              {t('account.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-orange-600 text-white hover:bg-orange-500">
              {t('account.paymentDetach')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const SettingsTab = () => {
  const t = useT()
  const user = useAuth((state) => state.user)
  const setUser = useAuth((state) => state.setUser)

  const [name, setName] = useState(user?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const saveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = { name }
      if (newPassword) {
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }
      const data = await API.user.put('/api/auth/profile', payload)
      setUser(data.user)
      toast.success(t('account.saved'), { description: data.user.name })
      setCurrentPassword('')
      setNewPassword('')
    } catch (error) {
      toast.error(t('account.saveError'), { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={saveProfile} className="glass-panel space-y-5 p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <span className="glass-btn glass-btn-primary grid h-14 w-14 place-items-center rounded-2xl">
          <UserRound className="h-6 w-6 text-white" aria-hidden />
        </span>
        <div>
          <p className="font-display text-lg font-bold text-white">{user?.name}</p>
          <p className="text-sm text-muted-foreground">{t('auth.login')}: <span className="font-bold text-purple-200">{user?.login}</span></p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="account-name" className="text-xs text-purple-200">{t('auth.name')}</Label>
          <Input id="account-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder={t('auth.namePh')} className="rounded-2xl border-white/20 bg-white/5" />
        </div>
      </div>

      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
        <p className="mb-3 font-display text-sm font-bold text-purple-200">{t('account.passwordChange')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="account-current" className="text-xs text-purple-200">{t('account.currentPassword')}</Label>
            <Input id="account-current" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" placeholder="••••••••" className="rounded-2xl border-white/20 bg-white/5" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-new" className="text-xs text-purple-200">{t('account.newPassword')}</Label>
            <Input id="account-new" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" placeholder="••••••••" className="rounded-2xl border-white/20 bg-white/5" />
          </div>
        </div>
      </div>

      <GlassButton type="submit" tone="primary" className="h-12 w-full sm:w-auto" disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Settings className="mr-2 h-4 w-4" aria-hidden />}
        {t('account.save')}
      </GlassButton>
    </form>
  )
}

const AccountView = () => {
  const user = useAuth((state) => state.user)
  const setAuthOpen = useAuth((state) => state.setAuthOpen)
  const logout = useAuth((state) => state.logout)
  const navigate = useShop((state) => state.navigate)
  const route = useShop((state) => state.route)
  const t = useT()

  // Таб можно открыть напрямую: #/account?tab=orders | payments
  const VALID_TABS = ['settings', 'orders', 'payments']
  const initialTab = VALID_TABS.includes(route.query.tab) ? route.query.tab : 'settings'
  const [tab, setTab] = useState(initialTab)
  if (route.query.tab && route.query.tab !== tab && VALID_TABS.includes(route.query.tab)) {
    setTab(route.query.tab)
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-24 text-center">
        <ShieldAlert className="h-12 w-12 text-orange-300" aria-hidden />
        <h1 className="font-display text-3xl font-bold text-white">{t('account.needAuthTitle')}</h1>
        <p className="text-sm font-semibold text-muted-foreground">{t('account.needAuthText')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <GlassButton tone="primary" onClick={() => setAuthOpen(true)}>{t('auth.title')}</GlassButton>
          <GlassButton tone="ghost" onClick={() => navigate('catalog')}>{t('cart.toCatalog')}</GlassButton>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
          <GradientText styleIndex={6}>{t('account.title')}</GradientText>
        </h1>
        <GlassButton tone="ghost" onClick={logout} className="h-10">
          {t('auth.logout')}
        </GlassButton>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-5">
        <TabsList className="grid w-full max-w-xl grid-cols-3 border border-purple-500/25 bg-[#12102a]">
          <TabsTrigger value="settings" className="gap-1.5 font-display">
            <Settings className="h-3.5 w-3.5" aria-hidden /> {t('account.settings')}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 font-display">
            <ReceiptText className="h-3.5 w-3.5" aria-hidden /> {t('account.orders')}
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5 font-display">
            <CreditCard className="h-3.5 w-3.5" aria-hidden /> {t('account.payments')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AccountView
