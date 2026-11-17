'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { PRICE_LIMITS, DEFAULT_LOCALE } from '@/lib/constants'
import { LOCALE_CODES, detectLocale } from '@/lib/i18n'

// Глобальный стор маршрутизации (SPA на единственном маршруте /) и UI-состояния.
// Фильтры, язык и активный стиль сохраняются в localStorage и переживают перезагрузку.

const KNOWN_VIEWS = ['catalog', 'product', 'checkout', 'admin', 'styles']

const parseQuery = (raw) => {
  const query = {}
  if (!raw) return query
  raw.split('&').forEach((pair) => {
    const [key, value] = pair.split('=')
    if (key) query[decodeURIComponent(key)] = decodeURIComponent(value || '')
  })
  return query
}

// Маршрут берётся из хэша, а если хэша нет — из пути (/admin открывается прямым набором)
const parseHash = () => {
  if (typeof window === 'undefined') return { view: 'home', slug: '', query: {} }
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [hashPath, hashQuery] = raw.split('?')
  const path = hashPath || window.location.pathname.replace(/^\/+/, '')
  const querySource = hashPath ? hashQuery : window.location.search.replace(/^\?/, '')
  const segments = path.split('/').filter(Boolean)
  const view = segments[0] || 'home'
  return {
    view: KNOWN_VIEWS.includes(view) ? view : 'home',
    slug: segments[1] ? decodeURIComponent(segments[1]) : '',
    query: parseQuery(querySource),
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

      syncRoute: () => set((state) => {
        const route = parseHash()
        // Параметры каталога из маршрута попадают в сохраняемые фильтры (навигация из шапки/подвала)
        const patch = {}
        if (route.view === 'catalog') {
          if (route.query.category) patch.category = route.query.category
          if (route.query.search !== undefined) patch.search = route.query.search
          if (route.query.discount) patch.discount = true
        }
        return {
          route,
          filters: Object.keys(patch).length ? { ...state.filters, ...patch } : state.filters,
        }
      }),

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
