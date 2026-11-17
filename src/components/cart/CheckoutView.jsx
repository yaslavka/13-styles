'use client'

import { useState } from 'react'
import { ArrowLeft, PackageCheck, Loader2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useCart from '@/store/useCart'
import useShop from '@/store/useShop'
import useT from '@/hooks/useT'
import { formatPrice } from '@/lib/constants'
import GlassButton from '@/components/motion/GlassButton'
import GradientText from '@/components/motion/GradientText'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

// Оформление заказа: контактные данные, состав корзины, подтверждение с номером заказа

const CheckoutView = () => {
  const items = useCart((state) => state.items)
  const total = useCart((state) => state.total())
  const clear = useCart((state) => state.clear)
  const navigate = useShop((state) => state.navigate)
  const setChatOpen = useShop((state) => state.setChatOpen)
  const locale = useShop((state) => state.locale)
  const t = useT()

  const [form, setForm] = useState({ customer: '', phone: '', address: '', comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null)
  const [error, setError] = useState('')

  const updateField = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        customer: form.customer,
        phone: form.phone,
        address: form.address,
        comment: form.comment,
        items: items.map((item) => ({ productId: item.productId, qty: item.qty, size: item.size })),
      }
      const data = await API.post('/api/orders', payload)
      clear()
      setDone(data.order)
      toast.success(t('toast.orderPlaced'), { description: t('toast.orderCode', { code: data.order.code }) })
    } catch (err) {
      setError(err.message)
      toast.error(t('checkout.error'), { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
        <span className="glass-btn glass-btn-primary grid h-24 w-24 place-items-center rounded-[1.8rem] animate-pop">
          <PackageCheck className="h-12 w-12 text-white" aria-hidden />
        </span>
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
          <GradientText styleIndex={4}>{t('checkout.done.title')}</GradientText>
        </h1>
        <p className="text-base font-semibold text-muted-foreground">
          {t('checkout.done.number')}
          <span className="ml-2 font-display text-2xl font-extrabold text-orange-300">{done.code}</span>
          <br />
          {t('checkout.done.sum', { amount: formatPrice(done.total, locale) })}
        </p>
        <p className="text-sm font-semibold leading-relaxed text-muted-foreground">{t('checkout.done.text')}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <GlassButton tone="primary" onClick={() => setChatOpen(true)}>
            <MessageCircle className="mr-2 h-4 w-4" aria-hidden /> {t('checkout.done.chat')}
          </GlassButton>
          <GlassButton tone="ghost" onClick={() => navigate('catalog')}>
            {t('checkout.done.shop')}
          </GlassButton>
        </div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-28 text-center">
        <span className="font-display text-5xl text-purple-400/60 animate-blink">✦ ✧ ✦</span>
        <h1 className="font-display text-3xl font-bold text-white">{t('checkout.emptyTitle')}</h1>
        <p className="text-sm font-semibold text-muted-foreground">{t('checkout.emptyText')}</p>
        <GlassButton tone="primary" onClick={() => navigate('catalog')}>
          {t('cart.toCatalog')}
        </GlassButton>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <button
        type="button"
        onClick={() => navigate('catalog')}
        className="mb-6 flex items-center gap-1.5 font-display text-sm font-bold text-purple-300 transition-colors hover:text-orange-300"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t('checkout.continue')}
      </button>

      <h1 className="mb-8 font-display text-4xl font-extrabold text-white sm:text-5xl">{t('checkout.title')}</h1>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <form onSubmit={submit} className="glass-panel space-y-5 p-6">
          <h2 className="font-display text-xl font-bold text-white">{t('checkout.dataTitle')}</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer" className="text-xs font-bold text-purple-200">{t('checkout.name')}</Label>
              <Input
                id="customer"
                required
                minLength={2}
                maxLength={80}
                value={form.customer}
                onChange={updateField('customer')}
                placeholder={t('checkout.namePh')}
                className="h-11 rounded-2xl border-white/20 bg-white/5 font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-bold text-purple-200">{t('checkout.phone')}</Label>
              <Input
                id="phone"
                required
                minLength={5}
                maxLength={20}
                value={form.phone}
                onChange={updateField('phone')}
                placeholder={t('checkout.phonePh')}
                className="h-11 rounded-2xl border-white/20 bg-white/5 font-semibold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-xs font-bold text-purple-200">{t('checkout.address')}</Label>
            <Input
              id="address"
              required
              minLength={2}
              maxLength={200}
              value={form.address}
              onChange={updateField('address')}
              placeholder={t('checkout.addressPh')}
              className="h-11 rounded-2xl border-white/20 bg-white/5 font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment" className="text-xs font-bold text-purple-200">{t('checkout.comment')}</Label>
            <Textarea
              id="comment"
              maxLength={500}
              value={form.comment}
              onChange={updateField('comment')}
              placeholder={t('checkout.commentPh')}
              className="min-h-24 rounded-2xl border-white/20 bg-white/5 font-semibold"
            />
          </div>

          {error ? (
            <p className="rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-200">
              {error}
            </p>
          ) : null}

          <GlassButton type="submit" tone="primary" className="h-13 w-full text-lg" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : null}
            {t('checkout.submit', { amount: formatPrice(total, locale) })}
          </GlassButton>
        </form>

        <aside className="glass-panel h-fit p-6">
          <h2 className="font-display text-xl font-bold text-white">{t('checkout.summaryTitle')}</h2>
          <ul className="scrollbar-glass mt-5 max-h-80 space-y-4 overflow-y-auto pr-1">
            {items.map((item) => (
              <li key={item.key} className="flex items-center gap-3">
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-purple-500/10">
                  {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">{item.name}</span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {item.qty} × {formatPrice(item.price, locale)} {item.size ? `· ${item.size}` : ''}
                  </span>
                </span>
                <span className="font-display text-sm font-bold text-orange-300">{formatPrice(item.price * item.qty, locale)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5">
            <span className="text-sm font-bold text-muted-foreground">{t('cart.total')}</span>
            <span className="font-display text-2xl font-extrabold text-white">{formatPrice(total, locale)}</span>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default CheckoutView
