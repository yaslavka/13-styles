'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, CreditCard, BadgeCheck, Copy, Wallet, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useShop from '@/store/useShop'
import useT from '@/hooks/useT'
import { formatPrice } from '@/lib/constants'
import GlassButton from '@/components/motion/GlassButton'
import SmartImage from '@/components/product/SmartImage'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

// Оплата одной позиции корзины: у каждого товара своя кнопка «Оплатить».
// Товар со включённой собственной ссылкой открывает paymentUrl продавца,
// остальные проходят через общую платёжную систему DOKU.
// ЗАКРЫТИЕ ДИАЛОГА никогда не удаляет товар из корзины: позиция уходит
// только после успешной оплаты (страница /payment/result) или по кнопке
// удаления в корзине.

const CONTACT_STORAGE_KEY = 'styles-pay-contact'

const readContact = () => {
  if (typeof window === 'undefined') return { customer: '', phone: '', address: '', comment: '' }
  try {
    return { customer: '', phone: '', address: '', comment: '', ...JSON.parse(window.localStorage.getItem(CONTACT_STORAGE_KEY) || '{}') }
  } catch {
    return { customer: '', phone: '', address: '', comment: '' }
  }
}

const PayItemDialog = ({ item, onClose }) => {
  const t = useT()
  const locale = useShop((state) => state.locale)

  const [form, setForm] = useState(readContact)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null)
  const [payUrl, setPayUrl] = useState('')
  const [dokuLoading, setDokuLoading] = useState(false)

  const byLink = item?.customPayment === true && item?.paymentUrl
  const itemTotal = item ? item.price * item.qty : 0

  // Не даём оплачивать пустоту: если позиция исчезла — закрываемся.
  // ВАЖНО: onClose лишь закрывает диалог и НЕ трогает корзину.
  useEffect(() => {
    if (!item) onClose()
  }, [item, onClose])

  const updateField = (field) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    try {
      window.localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify({ ...form, [field]: value }))
    } catch {
      /* localStorage недоступен — не критично */
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!item) return
    setSubmitting(true)
    try {
      // user.post: если покупатель авторизован, заказ попадёт в его историю (личный кабинет)
      const data = await API.user.post('/api/orders', {
        customer: form.customer,
        phone: form.phone,
        address: form.address,
        comment: form.comment,
        paymentMode: byLink ? 'link' : 'system',
        items: [{ productId: item.productId, qty: item.qty, size: item.size }],
      })
      setDone(data.order)
      setPayUrl(byLink ? item.paymentUrl : '')
      toast.success(t('pay.success'), { description: t('toast.orderCode', { code: data.order.code }) })
    } catch (err) {
      toast.error(t('pay.error'), { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const openPayLink = () => {
    if (!payUrl) return
    window.open(payUrl, '_blank', 'noopener,noreferrer')
    toast.info(t('pay.linkOpened'))
  }

  // Оплата через DOKU Checkout: конвертация EUR->IDR на сервере, страница DOKU в новой вкладке
  const payWithDoku = async () => {
    if (!done) return
    setDokuLoading(true)
    try {
      const data = await API.post('/api/payments/doku/create', { orderCode: done.code })
      toast.success(t('pay.dokuAmount', { amount: data.amountIdr.toLocaleString('en-US'), rate: data.rate }))
      window.location.href = data.paymentUrl
    } catch (err) {
      toast.error(t('pay.dokuError'), { description: err.message })
    } finally {
      setDokuLoading(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-md flex-col gap-4 overflow-y-auto rounded-3xl border-purple-500/30 bg-[#0a0918] p-4 sm:p-6"
      >
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="flex items-center gap-2 font-display text-purple-100">
            <CreditCard className="h-5 w-5 shrink-0 text-orange-300" aria-hidden />
            {done ? t('pay.doneTitle') : t('pay.title', { name: item.name })}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {done ? t('pay.doneText', { code: done.code }) : t('pay.subtitle')}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-5 py-2 text-center">
            <BadgeCheck className="mx-auto h-14 w-14 text-orange-300 animate-pop" aria-hidden />
            <p className="font-display text-3xl font-extrabold text-white">
              {t('pay.doneSum', { amount: formatPrice(done.total, locale) })}
            </p>
            <p className="flex items-center justify-center gap-2 text-sm font-bold text-purple-200">
              <Copy className="h-4 w-4" aria-hidden /> {done.code}
            </p>
            {payUrl ? (
              <GlassButton tone="primary" className="h-12 min-h-11 w-full text-base" onClick={openPayLink}>
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden /> {t('pay.openLink')}
              </GlassButton>
            ) : null}
            {!byLink ? (
              <GlassButton tone="primary" className="h-12 min-h-11 w-full text-base" onClick={payWithDoku} disabled={dokuLoading}>
                {dokuLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : <Wallet className="mr-2 h-4 w-4" aria-hidden />}
                {t('pay.dokuButton')}
              </GlassButton>
            ) : null}
            {!payUrl && byLink ? (
              <p className="text-sm font-semibold text-muted-foreground">{t('pay.doneNote')}</p>
            ) : null}
            <GlassButton tone="ghost" className="h-11 min-h-11 w-full" onClick={onClose}>
              {t('pay.close')}
            </GlassButton>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {/* Позиция оплаты */}
            <div className="glass-card flex items-center gap-3 p-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-purple-500/10">
                {item.image ? <SmartImage src={item.image} alt={item.name} spinner="sm" className="h-full w-full object-cover" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm font-bold text-white">{item.name}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {item.qty} × {formatPrice(item.price, locale)} {item.size ? `· ${item.size}` : ''}
                </span>
                {byLink ? (
                  <span className="mt-1 inline-block rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                    {t('pay.byLinkBadge')}
                  </span>
                ) : null}
              </span>
              <span className="font-display text-lg font-bold text-orange-300">{formatPrice(itemTotal, locale)}</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="pay-name" className="text-xs text-purple-200">{t('checkout.name')}</Label>
                <Input id="pay-name" required minLength={2} maxLength={80} value={form.customer} onChange={updateField('customer')} placeholder={t('checkout.namePh')} className="min-h-11 rounded-2xl border-white/20 bg-white/5" />
              </div>
              <div className="space-y-1.5 text-left">
                <Label htmlFor="pay-phone" className="text-xs text-purple-200">{t('checkout.phone')}</Label>
                <Input id="pay-phone" required minLength={5} maxLength={20} inputMode="tel" value={form.phone} onChange={updateField('phone')} placeholder={t('checkout.phonePh')} className="min-h-11 rounded-2xl border-white/20 bg-white/5" />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="pay-address" className="text-xs text-purple-200">{t('checkout.address')}</Label>
              <Input id="pay-address" required minLength={2} maxLength={200} value={form.address} onChange={updateField('address')} placeholder={t('checkout.addressPh')} className="min-h-11 rounded-2xl border-white/20 bg-white/5" />
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="pay-comment" className="text-xs text-purple-200">{t('checkout.comment')}</Label>
              <Textarea id="pay-comment" maxLength={500} value={form.comment} onChange={updateField('comment')} placeholder={t('checkout.commentPh')} className="min-h-16 rounded-2xl border-white/20 bg-white/5" />
            </div>

            {byLink ? (
              <p className="rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-xs font-bold text-orange-200">
                {t('pay.byLinkNote')}
              </p>
            ) : (
              <p className="flex items-center justify-center gap-2 text-[11px] font-semibold text-purple-200/70">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden /> {t('pay.secure')}
              </p>
            )}

            {/* Кнопки формы:submit на всю ширину, «Отмена» по кнопке закрытия — как положено в форме */}
            <div className="space-y-2.5">
              <GlassButton type="submit" tone="primary" className="h-12 min-h-11 w-full text-lg" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : <CreditCard className="mr-2 h-4 w-4" aria-hidden />}
                {t('pay.submit', { amount: formatPrice(itemTotal, locale) })}
              </GlassButton>
              <GlassButton type="button" tone="ghost" className="h-11 min-h-11 w-full" onClick={onClose} disabled={submitting}>
                {t('pay.cancel')}
              </GlassButton>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default PayItemDialog
