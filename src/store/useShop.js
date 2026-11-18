'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { PRICE_LIMITS, DEFAULT_LOCALE } from '@/lib/constants'
import { LOCALE_CODES, detectLocale } from '@/lib/i18n'

// Глобальный стор UI-состояния 13 STYLES.
// Маршрутизация теперь НАСТОЯЩАЯ (App Router): /, /catalog, /catalog/category/[slug],
// /catalog/category/[slug]/[sub], /product/[slug], /checkout, /account, /admin, /styles.
// Фильтры, язык и активный стиль сохраняются в localStorage и переживают перезагрузку.

// buildPath('category', { slug: 'women' }) -> '/catalog/category/women'
// buildPath('subcategory', { slug: 'women', sub: 'women-dresses' }) -> '/catalog/category/women/women-dresses'
const buildPath = (view, options = {}) => {
  const { slug = '', sub = '', query = {} } = options
  const params = new URLSearchParams()
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== false) params.set(key, String(value))
  })
  const qs = params.toString()
  const withQuery = (path) => (qs ? `${path}?${qs}` : path)

  switch (view) {
    case 'catalog':
      // Категория из хэш-навигации превращается в SEO-страницу категории
      if (query && query.category) return withQuery(`/catalog/category/${encodeURIComponent(query.category)}`)
      if (query && query.discount) return withQuery('/catalog')
      return withQuery('/catalog')
    case 'category':
      return withQuery(`/catalog/category/${encodeURIComponent(slug)}`)
    case 'subcategory':
      return withQuery(`/catalog/category/${encodeURIComponent(slug)}/${encodeURIComponent(sub)}`)
    case 'product':
      return withQuery(`/product/${encodeURIComponent(slug)}`)
    case 'checkout':
      return '/checkout'
    case 'account':
      return withQuery('/account')
    case 'admin':
      return slug ? `/admin/${slug}` : '/admin'
    case 'styles':
      return '/styles'
    case 'home':
    default:
      return withQuery('/')
  }
}

// Роутер Next.js подключается один раз из AppShell (zustand-экшены вне React-контекста)
let routerRef = null

const initialFilters = {
  category: 'all',
  subcategory: 'all',
  gender: 'all',
  sizes: [],
  min: PRICE_LIMITS.min,
  max: PRICE_LIMITS.max,
  discount: false,
  search: '',
  sort: 'new',
}

const useShop = create(
  persist(
    (set) => ({
      filters: initialFilters,
      chatOpen: false,
      accentStyle: 2,
      locale: DEFAULT_LOCALE,

      attachRouter: (router) => {
        routerRef = router
      },

      navigate: (view, options = {}) => {
        const path = buildPath(view, options)
        if (routerRef) {
          routerRef.push(path)
        } else if (typeof window !== 'undefined') {
          window.location.href = path
        }
        // Синхронизируем сохраняемые фильтры с параметрами навигации (шапка/подвал/баннеры)
        const patch = {}
        if (view === 'catalog') {
          if (options.query?.category) patch.category = options.query.category
          if (options.query?.search !== undefined) patch.search = options.query.search
          if (options.query?.discount) patch.discount = true
        }
        if (Object.keys(patch).length) set((state) => ({ filters: { ...state.filters, ...patch } }))
        return path
      },

      href: (view, options = {}) => buildPath(view, options),

      setFilter: (patch) => set((state) => ({ filters: { ...state.filters, ...patch } })),

      resetFilters: () => set({ filters: initialFilters }),

      setChatOpen: (open) => set({ chatOpen: Boolean(open) }),

      setAccentStyle: (style) => set({ accentStyle: style }),

      setLocale: (code) => {
        const safe = LOCALE_CODES.includes(code) ? code : DEFAULT_LOCALE
        if (typeof document !== 'undefined') document.documentElement.lang = safe
        set({ locale: safe })
      },

      initLocale: () => {
        if (typeof document === 'undefined') return
        const current = useShop.getState().locale
        const resolved = LOCALE_CODES.includes(current) ? current : detectLocale()
        document.documentElement.lang = resolved
        set({ locale: resolved })
      },
    }),
    {
      name: 'pixart-shop-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ filters: state.filters, locale: state.locale, accentStyle: state.accentStyle }),
      skipHydration: true,
    }
  )
)

export default useShop
