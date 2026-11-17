'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { PRICE_LIMITS, DEFAULT_LOCALE } from '@/lib/constants'
import { LOCALE_CODES, detectLocale } from '@/lib/i18n'

// Глобальный стор маршрутизации (SPA на единственном маршруте /) и UI-состояния.
// Фильтры, язык и активный стиль сохраняются в localStorage и переживают перезагрузку.

const KNOWN_VIEWS = ['catalog', 'product', 'checkout', 'admin', 'styles']

const parseHash = () => {
  if (typeof window === 'undefined') return { view: 'home', slug: '', query: {} }
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [pathPart, queryPart] = raw.split('?')
  const segments = pathPart.split('/').filter(Boolean)
  const query = {}
  if (queryPart) {
    queryPart.split('&').forEach((pair) => {
      const [key, value] = pair.split('=')
      if (key) query[decodeURIComponent(key)] = decodeURIComponent(value || '')
    })
  }
  const view = segments[0] || 'home'
  return {
    view: KNOWN_VIEWS.includes(view) ? view : 'home',
    slug: segments[1] ? decodeURIComponent(segments[1]) : '',
    query,
  }
}

const buildHash = (view, options = {}) => {
  const { slug = '', query = {} } = options
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== false) params.set(key, String(value))
  })
  const qs = params.toString()
  return `#/${view}${slug ? `/${slug}` : ''}${qs ? `?${qs}` : ''}`
}

const initialFilters = {
  category: 'all',
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
      route: { view: 'home', slug: '', query: {} },
      filters: initialFilters,
      chatOpen: false,
      accentStyle: 2,
      locale: DEFAULT_LOCALE,

      syncRoute: () => set({ route: parseHash() }),

      navigate: (view, options = {}) => {
        const hash = buildHash(view, options)
        if (typeof window !== 'undefined' && window.location.hash !== hash) {
          window.location.hash = hash
        }
        set({ route: { view: KNOWN_VIEWS.includes(view) ? view : 'home', slug: options.slug || '', query: options.query || {} } })
      },

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
