'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Корзина с сохранением в localStorage

const MAX_QTY = 20

const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),

      add: (product, { size = '', qty = 1 } = {}) => {
        const key = `${product.slug}__${size || 'one'}`
        const existing = get().items.find((item) => item.key === key)
        if (existing) {
          set({
            items: get().items.map((item) =>
              item.key === key ? { ...item, qty: Math.min(MAX_QTY, item.qty + qty) } : item
            ),
          })
          return
        }
        set({
          items: [
            ...get().items,
            {
              key,
              productId: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              oldPrice: product.oldPrice ?? null,
              image: (product.images && product.images[0]) || '',
              size: size || '',
              qty: Math.min(MAX_QTY, qty),
              // Собственная ссылка оплаты товара: если включена, «Оплатить» у позиции
              // ведёт на неё вместо общей платёжной системы
              customPayment: product.customPayment === true,
              paymentUrl: product.paymentUrl || '',
            },
          ],
        })
      },

      setQty: (key, qty) => {
        const safe = Math.max(1, Math.min(MAX_QTY, Math.round(qty)))
        set({ items: get().items.map((item) => (item.key === key ? { ...item, qty: safe } : item)) })
      },

      remove: (key) => set({ items: get().items.filter((item) => item.key !== key) }),

      clear: () => set({ items: [] }),

      total: () => get().items.reduce((sum, item) => sum + item.price * item.qty, 0),

      count: () => get().items.reduce((sum, item) => sum + item.qty, 0),
    }),
    {
      name: 'pixart-cart',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
)

export default useCart
