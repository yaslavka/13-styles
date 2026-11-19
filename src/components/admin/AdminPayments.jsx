'use client'

import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Save, RefreshCw, ShieldCheck, Copy, ExternalLink, Wallet, CalendarRange } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useShop from '@/store/useShop'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import GlassButton from '@/components/motion/GlassButton'

// Раздел админки «Платежи DOKU»: мерчанты (ключи, боевой/тестовый режим),
// глобальные настройки, список платежей со статусами из уведомлений DOKU.

const STATUS_STYLES = {
  pending: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
  success: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
  failed: 'bg-rose-500/20 text-rose-200 border-rose-400/30',
  expired: 'bg-zinc-500/20 text-zinc-200 border-zinc-400/30',
  canceled: 'bg-zinc-500/20 text-zinc-300 border-zinc-400/30',
  refunded: 'bg-sky-500/20 text-sky-200 border-sky-400/30',
}

const STATUS_LABELS = {
  pending: 'ожидание',
  success: 'успешно',
  failed: 'ошибка',
  expired: 'истёк',
  canceled: 'отменён',
  refunded: 'возврат',
}

// Карточки статистики: порядок и цвета. failed объединяет неудачные и истёкшие
// (истёкшие показываются в карточке отдельной строкой).
const STAT_CARDS = [
  { key: 'success', title: 'Успешные платежи', accent: 'text-emerald-300', ring: 'border-emerald-400/30', bg: 'bg-emerald-500/10', extra: null },
  { key: 'pending', title: 'Ожидаются', accent: 'text-amber-300', ring: 'border-amber-400/30', bg: 'bg-amber-500/10', extra: null },
  { key: 'failed', title: 'Неудачные', accent: 'text-rose-300', ring: 'border-rose-400/30', bg: 'bg-rose-500/10', extra: 'expired' },
  { key: 'canceled', title: 'Отменённые', accent: 'text-zinc-300', ring: 'border-zinc-400/30', bg: 'bg-zinc-500/10', extra: null },
]

const fmtEur = (value) => `€${Number(value || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtIdr = (value) => `Rp ${Number(value || 0).toLocaleString('ru-RU')}`

// Периоды-пресеты для блока статистики
const shiftDate = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

const AdminPayments = () => {
  const siteUrl = useShop((state) => state.siteUrl || 'http://localhost:3000')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [merchants, setMerchants] = useState([])
  const [settings, setSettings] = useState({ siteUrl: '', notifyAllowUnverified: false, eurIdrFallback: 17500, paymentDueMinutes: 60, customerTokenization: true })
  const [payments, setPayments] = useState([])
  const [hosts, setHosts] = useState({ production: '', sandbox: '' })
  const [envInfo, setEnvInfo] = useState({})
  // Статистика платежей за период (с — по)
  const [payStats, setPayStats] = useState({})
  const [range, setRange] = useState({ from: '', to: '' })
  const [statsLoading, setStatsLoading] = useState(false)

  const loadStats = async (nextRange = range) => {
    setStatsLoading(true)
    try {
      const params = new URLSearchParams()
      if (nextRange.from) params.set('from', nextRange.from)
      if (nextRange.to) params.set('to', nextRange.to)
      const query = params.toString()
      const data = await API.admin.get(`/api/admin/payments/stats${query ? `?${query}` : ''}`)
      setPayStats(data.stats || {})
    } catch (error) {
      toast.error('Не удалось загрузить статистику платежей', { description: error.message })
    } finally {
      setStatsLoading(false)
    }
  }

  const applyPreset = (days) => {
    const nextRange = days === null ? { from: '', to: '' } : { from: shiftDate(days), to: new Date().toISOString().slice(0, 10) }
    setRange(nextRange)
    loadStats(nextRange)
  }

  const notifyUrl = useMemo(() => `${settings.siteUrl || siteUrl || 'https://your-domain.com'}/api/payments/doku/notify`, [settings.siteUrl, siteUrl])

  const load = async () => {
    setLoading(true)
    try {
      const data = await API.admin.get('/api/admin/payments')
      setMerchants(data.merchants || [])
      setSettings(data.settings || settings)
      setPayments(data.payments || [])
      setHosts(data.hosts || {})
      setEnvInfo(data.env || {})
    } catch (error) {
      toast.error('Не удалось загрузить настройки', { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { loadStats() }, [])

  const updateMerchant = (index, patch) => {
    setMerchants((prev) => prev.map((m, i) => {
      if (i !== index) return patch.isDefault === true ? { ...m, isDefault: false } : m
      return { ...m, ...patch }
    }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await API.admin.put('/api/admin/payments', {
        merchants: merchants.map((m) => ({
          code: m.code,
          name: m.name,
          clientId: m.clientId || '',
          // Пустое поле = не менять сохранённый секрет
          secretKey: m.secretKeyEdit !== undefined && m.secretKeyEdit !== '' ? m.secretKeyEdit : m.secretKey,
          apiKey: m.apiKey || '',
          mode: m.mode,
          sandboxClientId: m.sandboxClientId || '',
          sandboxSecretKey: m.sandboxSecretKeyEdit !== undefined && m.sandboxSecretKeyEdit !== '' ? m.sandboxSecretKeyEdit : m.sandboxSecretKey,
          isDefault: m.isDefault === true,
          enabled: m.enabled === true,
        })),
        settings: {
          siteUrl: String(settings.siteUrl || '').trim(),
          notifyAllowUnverified: settings.notifyAllowUnverified === true,
          eurIdrFallback: Number(settings.eurIdrFallback) || 17500,
          paymentDueMinutes: Number(settings.paymentDueMinutes) || 60,
          customerTokenization: settings.customerTokenization === true,
        },
      })
      toast.success('Настройки платежей сохранены')
      await load()
    } catch (error) {
      toast.error('Ошибка сохранения', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const copyNotify = () => {
    navigator.clipboard?.writeText(notifyUrl)
    toast.success('URL уведомления скопирован')
  }

  if (loading) {
    return (
      <div className="glass-panel flex items-center justify-center gap-3 p-10 text-purple-200">
        <RefreshCw className="h-5 w-5 animate-spin" aria-hidden /> Загрузка настроек…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-white">
          <CreditCard className="h-6 w-6 text-orange-300" aria-hidden /> Платежи DOKU
        </h2>
        <GlassButton tone="primary" onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" aria-hidden /> {saving ? 'Сохранение…' : 'Сохранить всё'}
        </GlassButton>
      </div>

      {/* Информация о подключении */}
      <div className="glass-panel space-y-3 p-5">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white">
          <ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden /> Подключение к DOKU
        </h3>
        <div className="grid gap-3 text-sm text-purple-100 sm:grid-cols-2">
          <div>
            <span className="font-bold text-purple-300">Серверный callback (HTTP Notification):</span>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 truncate rounded-xl bg-black/40 px-3 py-1.5 text-xs text-emerald-200">{notifyUrl}</code>
              <button type="button" onClick={copyNotify} aria-label="Скопировать URL уведомления" className="glass-btn glass-btn-ghost rounded-xl px-2.5 py-1.5">
                <Copy className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-emerald-200/80">
              Callback URL передаётся прямо в запросе создания платежа (additional_info.override_notification_url),
              а возврат покупателя — в order.callback_url. Настраивать Notification URL в DOKU Console не требуется.
            </p>
          </div>
          <div className="space-y-1">
            <p><span className="font-bold text-purple-300">Хост боевой:</span> <code className="text-xs">{hosts.production}</code></p>
            <p><span className="font-bold text-purple-300">Хост тестовый:</span> <code className="text-xs">{hosts.sandbox}</code></p>
            {envInfo.dokuEnv ? <p><span className="font-bold text-purple-300">DOKU_ENV в .env:</span> {envInfo.dokuEnv}{envInfo.notifyAllowUnverifiedEnv ? ' · уведомления без подписи разрешены (.env)' : ''}</p> : null}
          </div>
        </div>
        <p className="text-xs leading-relaxed text-purple-200/70">
          Суммы каталога указаны в EUR — при создании платежа они конвертируются в IDR по живому курсу
          (обновление раз в 30 минут, при недоступности курса API используется резервный курс из настроек ниже).
          Токенизация карт включается параметром customer.id: DOKU сохраняет карту покупателя на своей стороне,
          токен приходит в уведомлении и попадает в профиль пользователя. Рекуррентные списания требуют активации
          off-session платежей в DOKU Console — пока они не проводятся, способ оплаты сохраняется.
        </p>
      </div>

      {/* Статистика платежей за период */}
      <div className="glass-panel space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <Wallet className="h-5 w-5 text-emerald-300" aria-hidden /> Статистика платежей
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => applyPreset(null)} className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${!range.from && !range.to ? 'bg-purple-500/30 text-white' : 'text-purple-300 hover:text-white'}`}>
              Всё время
            </button>
            <button type="button" onClick={() => applyPreset(0)} className="rounded-xl px-3 py-1.5 text-xs font-bold text-purple-300 transition-colors hover:text-white">
              Сегодня
            </button>
            <button type="button" onClick={() => applyPreset(6)} className="rounded-xl px-3 py-1.5 text-xs font-bold text-purple-300 transition-colors hover:text-white">
              7 дней
            </button>
            <button type="button" onClick={() => applyPreset(29)} className="rounded-xl px-3 py-1.5 text-xs font-bold text-purple-300 transition-colors hover:text-white">
              30 дней
            </button>
            <button type="button" onClick={() => loadStats()} className="glass-btn glass-btn-ghost rounded-xl px-2.5 py-1.5" aria-label="Обновить статистику">
              <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} aria-hidden />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="stats-from" className="text-xs font-bold text-purple-200">С</Label>
            <Input
              id="stats-from" type="date" value={range.from}
              onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
              className="bg-black/30 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stats-to" className="text-xs font-bold text-purple-200">По</Label>
            <Input
              id="stats-to" type="date" value={range.to}
              onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
              className="bg-black/30 text-sm"
            />
          </div>
          <GlassButton tone="ghost" onClick={() => loadStats()} disabled={statsLoading} className="h-10">
            <CalendarRange className="mr-2 h-4 w-4" aria-hidden /> Показать
          </GlassButton>
          {range.from || range.to ? (
            <p className="pb-2 text-xs text-purple-200/70">
              Период: {range.from || 'начало'} — {range.to || 'сегодня'}
            </p>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map((card) => {
            const item = payStats[card.key] || { count: 0, sumEur: 0, sumIdr: 0 }
            const expiredItem = card.extra ? payStats[card.extra] : null
            return (
              <div key={card.key} className={`rounded-2xl border ${card.ring} ${card.bg} p-4`}>
                <p className={`text-xs font-bold uppercase tracking-wide ${card.accent}`}>{card.title}</p>
                <p className="mt-1 font-display text-2xl font-bold text-white">{fmtEur(item.sumEur)}</p>
                <p className="mt-1 text-xs text-purple-200/80">{item.count} плат. · {fmtIdr(item.sumIdr)}</p>
                {expiredItem ? (
                  <p className="mt-1 text-[11px] text-zinc-300/80">+ истёкших: {expiredItem.count} · {fmtEur(expiredItem.sumEur)}</p>
                ) : null}
              </div>
            )
          })}
        </div>
        {payStats.refunded ? (
          <p className="text-xs text-sky-200/80">Возвраты: {payStats.refunded.count} · {fmtEur(payStats.refunded.sumEur)}</p>
        ) : null}
      </div>

      {/* Глобальные настройки */}
      <div className="glass-panel space-y-4 p-5">
        <h3 className="font-display text-lg font-bold text-white">Глобальные настройки</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="siteurl" className="text-xs font-bold text-purple-200">Адрес сайта (для callback DOKU)</Label>
            <Input
              id="siteurl" type="url" placeholder="https://13styles.ru"
              value={settings.siteUrl}
              onChange={(e) => setSettings((prev) => ({ ...prev, siteUrl: e.target.value }))}
              className="bg-black/30"
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              Публичный HTTPS-домен магазина: он подставляется в callback_url и override_notification_url каждого платежа.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate" className="text-xs font-bold text-purple-200">Резервный курс EUR→IDR</Label>
            <Input
              id="rate" type="number" step="0.01" min="1000"
              value={settings.eurIdrFallback}
              onChange={(e) => setSettings((prev) => ({ ...prev, eurIdrFallback: e.target.value }))}
              className="bg-black/30"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="due" className="text-xs font-bold text-purple-200">Срок оплаты (минут)</Label>
            <Input
              id="due" type="number" min="10"
              value={settings.paymentDueMinutes}
              onChange={(e) => setSettings((prev) => ({ ...prev, paymentDueMinutes: e.target.value }))}
              className="bg-black/30"
            />
          </div>
          <div className="space-y-3 pt-1">
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-black/30 px-4 py-3">
              <span className="text-sm font-semibold text-purple-100">Принимать уведомления без подписи (тест)</span>
              <Switch
                checked={settings.notifyAllowUnverified === true}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, notifyAllowUnverified: checked }))}
                aria-label="Уведомления без подписи"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-black/30 px-4 py-3">
              <span className="text-sm font-semibold text-purple-100">Токенизация карт (customer.id)</span>
              <Switch
                checked={settings.customerTokenization === true}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, customerTokenization: checked }))}
                aria-label="Токенизация карт"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Мерчанты */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold text-white">Мерчанты ({merchants.length})</h3>
        {merchants.map((merchant, index) => (
          <div key={merchant.code} className="glass-panel space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-display text-lg font-bold text-white">{merchant.name}</span>
                <code className="rounded-lg bg-black/40 px-2 py-0.5 text-xs text-purple-300">{merchant.code}</code>
                {merchant.isDefault ? <Badge className="border-orange-400/30 bg-orange-500/20 text-orange-200">по умолчанию</Badge> : null}
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-purple-100">
                  <input
                    type="radio" name="default-merchant" checked={merchant.isDefault === true}
                    onChange={() => updateMerchant(index, { isDefault: true })}
                    className="accent-orange-400" aria-label={`Сделать ${merchant.name} мерчантом по умолчанию`}
                  />
                  по умолчанию
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-purple-100">
                  <Switch
                    checked={merchant.enabled === true}
                    onCheckedChange={(checked) => updateMerchant(index, { enabled: checked })}
                    aria-label={`Включить ${merchant.name}`}
                  />
                  включён
                </label>
                <div className="flex overflow-hidden rounded-xl border border-purple-500/30">
                  <button
                    type="button" onClick={() => updateMerchant(index, { mode: 'production' })}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${merchant.mode !== 'sandbox' ? 'bg-emerald-500/25 text-emerald-200' : 'text-purple-300 hover:text-white'}`}
                  >
                    БОЕВОЙ
                  </button>
                  <button
                    type="button" onClick={() => updateMerchant(index, { mode: 'sandbox' })}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${merchant.mode === 'sandbox' ? 'bg-amber-500/25 text-amber-200' : 'text-purple-300 hover:text-white'}`}
                  >
                    ТЕСТ
                  </button>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-purple-200">Client ID</Label>
                <Input
                  value={merchant.clientId || ''}
                  onChange={(e) => updateMerchant(index, { clientId: e.target.value })}
                  className="bg-black/30 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-purple-200">Secret Key</Label>
                <Input
                  type="password" placeholder={merchant.secretKeyMasked || 'введите ключ'}
                  value={merchant.secretKeyEdit || ''}
                  onChange={(e) => updateMerchant(index, { secretKeyEdit: e.target.value })}
                  className="bg-black/30 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-purple-200">API Key</Label>
                <Input
                  value={merchant.apiKey || ''}
                  onChange={(e) => updateMerchant(index, { apiKey: e.target.value })}
                  className="bg-black/30 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-amber-200">Client ID (тестовый)</Label>
                <Input
                  value={merchant.sandboxClientId || ''}
                  onChange={(e) => updateMerchant(index, { sandboxClientId: e.target.value })}
                  className="bg-black/30 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-amber-200">Secret Key (тестовый)</Label>
                <Input
                  type="password" placeholder={merchant.sandboxSecretKeyMasked || 'введите ключ песочницы'}
                  value={merchant.sandboxSecretKeyEdit || ''}
                  onChange={(e) => updateMerchant(index, { sandboxSecretKeyEdit: e.target.value })}
                  className="bg-black/30 text-xs"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Платежи */}
      <div className="glass-panel space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold text-white">Последние платежи</h3>
        </div>
        {payments.length === 0 ? (
          <p className="py-6 text-center text-sm text-purple-200/60">Платежей пока нет — оформите заказ и оплатите через DOKU</p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-2xl border border-purple-500/20">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-purple-950/90 text-purple-300">
                <tr>
                  <th className="px-3 py-2">Заказ</th>
                  <th className="px-3 py-2">Мерчант</th>
                  <th className="px-3 py-2">EUR</th>
                  <th className="px-3 py-2">IDR</th>
                  <th className="px-3 py-2">Курс</th>
                  <th className="px-3 py-2">Статус</th>
                  <th className="px-3 py-2">Канал</th>
                  <th className="px-3 py-2">Карта</th>
                  <th className="px-3 py-2">Дата</th>
                </tr>
              </thead>
              <tbody className="text-purple-100">
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-purple-500/10 hover:bg-purple-500/5">
                    <td className="max-w-32 truncate px-3 py-2 font-mono">{p.orderCode}</td>
                    <td className="px-3 py-2">{p.merchantCode}</td>
                    <td className="px-3 py-2">€{Number(p.amountEur).toFixed(2)}</td>
                    <td className="px-3 py-2">{p.amountIdr?.toLocaleString('ru-RU')}</td>
                    <td className="px-3 py-2">{p.rate}</td>
                    <td className="px-3 py-2">
                      <Badge className={`border text-[10px] ${STATUS_STYLES[p.status] || 'border-purple-400/30 bg-purple-500/20 text-purple-200'}`}>
                        {STATUS_LABELS[p.status] || p.status}
                      </Badge>
                    </td>
                    <td className="max-w-24 truncate px-3 py-2">{p.channel || '—'}</td>
                    <td className="px-3 py-2">{p.cardLast4 ? `•••• ${p.cardLast4}` : p.hasCardToken ? 'токен' : '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2">{new Date(p.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {payments.some((p) => p.payUrl) ? (
          <p className="text-xs text-purple-200/60">
            <ExternalLink className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            Страница оплаты сохраняется у каждого платежа — ссылку можно переотправить покупателю.
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default AdminPayments
