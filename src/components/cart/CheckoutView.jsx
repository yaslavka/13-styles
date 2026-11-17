'use client'

import { useState } from 'react'
import { ArrowLeft, PackageCheck, Loader2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import API from '@/lib/api'
import useCart from '@/store/useCart'
import useShop from '@/store/useShop'
import { formatPrice, styleGradient } from '@/lib/constants'
import PixelButton from '@/components/motion/PixelButton'
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
      toast.success('Заказ принят!', { description: `Номер: ${data.order.code}` })
    } catch (err) {
      setError(err.message)
      toast.error('Ошибка оформления', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-20 text-center sm:px-6">
        <span className="pixel-corners grid h-20 w-20 place-items-center bg-gradient-to-br from-purple-600 to-orange-500 shadow-[0_0_40px_rgba(139,92,246,0.6)] animate-pop">
          <PackageCheck className="h-10 w-10 text-white" aria-hidden />
        </span>
        <h1 className="font-display text-3xl font-bold text-white">Заказ принят!</h1>
        <p className="text-sm text-muted-foreground">
          Номер заказа
          <span className="ml-2 font-display text-xl text-orange-300">{done.code}</span>
          <br />
          Сумма: <span className="font-display text-purple-200">{formatPrice(done.total)}</span>
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Техподдержка свяжется с тобой в чате для подтверждения. Статус заказа можно спросить там же — отвечаем 24/7.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <PixelButton tone="primary" onClick={() => setChatOpen(true)}>
            <MessageCircle className="mr-2 h-4 w-4" aria-hidden /> Открыть чат
          </PixelButton>
          <PixelButton tone="outline" onClick={() => navigate('catalog')}>
            Продолжить шопинг
          </PixelButton>
        </div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
        <span className="font-display text-5xl text-purple-500/60 animate-blink">▚▞▚</span>
        <h1 className="font-display text-2xl text-white">Корзина пуста</h1>
        <p className="text-sm text-muted-foreground">Сначала добавь товары — потом оформим доставку</p>
        <PixelButton tone="primary" onClick={() => navigate('catalog')}>
          В каталог
        </PixelButton>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <button
        type="button"
        onClick={() => navigate('catalog')}
        className="mb-5 flex items-center gap-1.5 font-display text-sm text-purple-300 transition-colors hover:text-orange-300"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Продолжить шопинг
      </button>

      <h1 className="mb-7 font-display text-3xl font-bold text-white sm:text-4xl">
        Оформление заказа
        <span className="ml-3 text-orange-500 animate-blink">▞</span>
      </h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <form onSubmit={submit} className="pixel-corners space-y-4 border border-purple-500/25 bg-card/70 p-5 backdrop-blur-sm">
          <h2 className="font-display text-lg text-white">Данные получателя</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer" className="text-xs text-purple-200">Имя и фамилия *</Label>
              <Input
                id="customer"
                required
                minLength={2}
                maxLength={80}
                value={form.customer}
                onChange={updateField('customer')}
                placeholder="Саша Пиксельный"
                className="border-purple-500/30 bg-[#0d0c1c]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs text-purple-200">Телефон *</Label>
              <Input
                id="phone"
                required
                minLength={5}
                maxLength={20}
                value={form.phone}
                onChange={updateField('phone')}
                placeholder="+7 999 123-45-67"
                className="border-purple-500/30 bg-[#0d0c1c]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs text-purple-200">Адрес доставки *</Label>
            <Input
              id="address"
              required
              minLength={2}
              maxLength={200}
              value={form.address}
              onChange={updateField('address')}
              placeholder="г. Москва, ул. 8-битная, д. 16, кв. 50"
              className="border-purple-500/30 bg-[#0d0c1c]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comment" className="text-xs text-purple-200">Комментарий</Label>
            <Textarea
              id="comment"
              maxLength={500}
              value={form.comment}
              onChange={updateField('comment')}
              placeholder="Позвонить заранее, оставить у двери…"
              className="min-h-20 border-purple-500/30 bg-[#0d0c1c]"
            />
          </div>

          {error ? (
            <p className="pixel-corners-sm border border-orange-500/50 bg-orange-500/10 px-3 py-2 text-sm text-orange-200">
              {error}
            </p>
          ) : null}

          <PixelButton type="submit" tone="primary" className="h-12 w-full text-base" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Подтвердить заказ · {formatPrice(total)}
          </PixelButton>
        </form>

        <aside className="pixel-corners h-fit border border-purple-500/25 bg-card/70 p-5 backdrop-blur-sm">
          <h2 className="font-display text-lg text-white">Твой пиксель-лут</h2>
          <ul className="scrollbar-pixel mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
            {items.map((item) => (
              <li key={item.key} className="flex items-center gap-3">
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-sm" style={{ background: styleGradient(4) }}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover image-pixelated" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.qty} × {formatPrice(item.price)} {item.size ? `· ${item.size}` : ''}
                  </span>
                </span>
                <span className="font-display text-sm text-orange-300">{formatPrice(item.price * item.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-purple-500/20 pt-4">
            <span className="text-sm text-muted-foreground">Итого</span>
            <span className="font-display text-xl font-bold text-white">{formatPrice(total)}</span>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default CheckoutView
