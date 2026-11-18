'use client'

import { useState } from 'react'
import { Minus, Plus, Trash2, ShoppingBag, CreditCard, Link2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import useCart from '@/store/useCart'
import useShop from '@/store/useShop'
import useT from '@/hooks/useT'
import { formatPrice } from '@/lib/constants'
import PayItemDialog from '@/components/cart/PayItemDialog'
import SmartImage from '@/components/product/SmartImage'

// Корзина: изменение количества, удаление и ПОЗИЦИОННАЯ оплата.
// Общей кнопки «Оплатить» нет — каждый товар оплачивается своей кнопкой;
// товары с собственной ссылкой оплаты открывают paymentUrl продавца.

const CartSheet = () => {
  const isOpen = useCart((state) => state.isOpen)
  const close = useCart((state) => state.close)
  const items = useCart((state) => state.items)
  const setQty = useCart((state) => state.setQty)
  const remove = useCart((state) => state.remove)
  const total = useCart((state) => state.total())
  const navigate = useShop((state) => state.navigate)
  const locale = useShop((state) => state.locale)
  const t = useT()

  const [paying, setPaying] = useState(null)

  const goToCatalog = () => {
    close()
    navigate('catalog')
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? null : close())}>
      <SheetContent side="right" className="flex w-full flex-col border-white/15 bg-[#12102a]/95 backdrop-blur-xl sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display text-purple-200">
            <ShoppingBag className="h-5 w-5 text-orange-300" aria-hidden />
            {t('cart.title')} {items.length ? `· ${items.length}` : ''}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
            <span className="font-display text-5xl text-purple-400/60 animate-blink">✦ ✧ ✦</span>
            <p className="font-display text-2xl font-bold text-white">{t('cart.empty')}</p>
            <p className="text-sm font-semibold text-muted-foreground">{t('cart.emptyText')}</p>
            <button
              type="button"
              onClick={goToCatalog}
              className="glass-btn glass-btn-primary rounded-full px-6 py-3 font-display text-base font-bold text-white"
            >
              {t('cart.toCatalog')}
            </button>
          </div>
        ) : (
          <>
            <div className="scrollbar-glass flex-1 overflow-y-auto px-4 pb-4">
              <ul className="space-y-3.5">
                {items.map((item) => {
                  const byLink = item.customPayment === true && item.paymentUrl
                  return (
                    <li key={item.key} className="glass-card flex gap-3.5 p-3.5">
                      <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-purple-500/10">
                        {item.image ? (
                          <SmartImage src={item.image} alt={item.name} spinner="sm" className="h-full w-full object-cover" />
                        ) : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-base font-bold text-white">{item.name}</p>
                        {item.size ? <p className="text-xs font-bold text-purple-300">{t('cart.size', { size: item.size })}</p> : null}
                        <p className="mt-0.5 font-display text-sm font-bold text-orange-300">{formatPrice(item.price, locale)}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center rounded-full border border-white/20 bg-white/5">
                            <button
                              type="button"
                              onClick={() => setQty(item.key, item.qty - 1)}
                              className="grid h-8 w-8 place-items-center text-purple-200 hover:text-white"
                              aria-label="Decrease"
                            >
                              <Minus className="h-3.5 w-3.5" aria-hidden />
                            </button>
                            <span className="w-7 text-center text-sm font-bold text-white">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => setQty(item.key, item.qty + 1)}
                              className="grid h-8 w-8 place-items-center text-purple-200 hover:text-white"
                              aria-label="Increase"
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(item.key)}
                            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-orange-500/15 hover:text-orange-400"
                            aria-label={t('cart.remove', { name: item.name })}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                          <span className="ml-auto font-display text-sm font-bold text-white/85">
                            {formatPrice(item.price * item.qty, locale)}
                          </span>
                        </div>

                        {/* Оплата отдельной позиции: своей кнопкой, без общей корзинной оплаты */}
                        <button
                          type="button"
                          onClick={() => setPaying(item)}
                          className={`glass-btn mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2.5 font-display text-sm font-bold text-white ${
                            byLink ? 'glass-btn-ghost' : 'glass-btn-primary'
                          }`}
                          aria-label={`${t('cart.payItem')}: ${item.name}`}
                        >
                          {byLink ? <Link2 className="h-4 w-4" aria-hidden /> : <CreditCard className="h-4 w-4" aria-hidden />}
                          {t('cart.payItem')} · {formatPrice(item.price * item.qty, locale)}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="border-t border-white/10 px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-muted-foreground">{t('cart.total')}</span>
                <span className="font-display text-2xl font-extrabold text-white">{formatPrice(total, locale)}</span>
              </div>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-muted-foreground">{t('cart.perItemNote')}</p>
            </div>
          </>
        )}

        {paying ? (
          <PayItemDialog
            item={paying}
            onClose={() => {
              // Оплаченная позиция уходит из корзины (снимаем до сброса состояния)
              const paid = paying
              setPaying(null)
              if (paid) useCart.getState().remove(paid.key)
            }}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

export default CartSheet
