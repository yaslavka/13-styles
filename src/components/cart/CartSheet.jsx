'use client'

import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import useCart from '@/store/useCart'
import useShop from '@/store/useShop'
import { formatPrice, styleGradient } from '@/lib/constants'
import PixelButton from '@/components/motion/PixelButton'

// Корзина в выдвижной панели: изменение количества, удаление, итог

const CartSheet = () => {
  const isOpen = useCart((state) => state.isOpen)
  const close = useCart((state) => state.close)
  const items = useCart((state) => state.items)
  const setQty = useCart((state) => state.setQty)
  const remove = useCart((state) => state.remove)
  const total = useCart((state) => state.total())
  const navigate = useShop((state) => state.navigate)

  const goToCheckout = () => {
    close()
    navigate('checkout')
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => (open ? null : close())}>
      <SheetContent side="right" className="flex w-full flex-col border-purple-500/30 bg-[#0a0918] sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display text-purple-200">
            <ShoppingBag className="h-5 w-5 text-orange-400" aria-hidden />
            Корзина {items.length ? `· ${items.length}` : ''}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="font-display text-5xl text-purple-500/60 animate-blink">▚▞▚</span>
            <p className="font-display text-lg text-white">Корзина пуста</p>
            <p className="text-sm text-muted-foreground">Загляни в каталог — там пиксельные худи, кроссовки и рюкзаки</p>
            <PixelButton
              tone="primary"
              onClick={() => {
                close()
                navigate('catalog')
              }}
            >
              В каталог
            </PixelButton>
          </div>
        ) : (
          <>
            <div className="scrollbar-pixel flex-1 overflow-y-auto px-4 pb-4">
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.key} className="pixel-corners-sm flex gap-3 border border-purple-500/25 bg-card/70 p-3">
                    <span
                      className="h-16 w-16 shrink-0 overflow-hidden rounded-sm"
                      style={{ background: styleGradient(3) }}
                    >
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover image-pixelated" />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm text-white">{item.name}</p>
                      {item.size ? <p className="text-xs text-purple-300">Размер: {item.size}</p> : null}
                      <p className="mt-0.5 font-display text-sm text-orange-300">{formatPrice(item.price)}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex items-center border border-purple-500/40">
                          <button
                            type="button"
                            onClick={() => setQty(item.key, item.qty - 1)}
                            className="grid h-7 w-7 place-items-center text-purple-200 hover:text-white"
                            aria-label="Уменьшить количество"
                          >
                            <Minus className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <span className="w-7 text-center text-xs text-white">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(item.key, item.qty + 1)}
                            className="grid h-7 w-7 place-items-center text-purple-200 hover:text-white"
                            aria-label="Увеличить количество"
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(item.key)}
                          className="grid h-7 w-7 place-items-center text-muted-foreground transition-colors hover:text-orange-400"
                          aria-label={`Удалить ${item.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <span className="ml-auto font-display text-xs text-white/80">
                          {formatPrice(item.price * item.qty)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-purple-500/25 px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Итого</span>
                <span className="font-display text-xl font-bold text-white">{formatPrice(total)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Доставка 1–3 дня · возврат 14 дней</p>
              <Separator className="my-3 bg-purple-500/20" />
              <PixelButton tone="primary" className="h-12 w-full text-base" onClick={goToCheckout}>
                Оформить заказ <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </PixelButton>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default CartSheet
