'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SlidersHorizontal, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import useShop from '@/store/useShop'
import useDebounce from '@/hooks/useDebounce'
import useT from '@/hooks/useT'
import API from '@/lib/api'
import { SORT_OPTIONS, GENDERS, CLOTHING_SIZES, SHOE_SIZES, PRICE_LIMITS } from '@/lib/constants'
import ProductGrid from '@/components/product/ProductGrid'
import GlassButton from '@/components/motion/GlassButton'
import Reveal from '@/components/motion/Reveal'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Каталог: сохраняемые фильтры, сортировка, бесконечная подгрузка карточек по скроллу

const ALL_SIZES = [...CLOTHING_SIZES, ...SHOE_SIZES]

const buildQuery = (filters, offset, limit) => {
  const params = new URLSearchParams()
  if (filters.category && filters.category !== 'all') params.set('category', filters.category)
  if (filters.gender && filters.gender !== 'all') params.set('gender', filters.gender)
  if (filters.search) params.set('search', filters.search)
  if (filters.sort && filters.sort !== 'new') params.set('sort', filters.sort)
  if (filters.min > PRICE_LIMITS.min) params.set('min', String(filters.min))
  if (filters.max < PRICE_LIMITS.max) params.set('max', String(filters.max))
  if (filters.sizes?.length) params.set('sizes', filters.sizes.join(','))
  if (filters.discount) params.set('discount', '1')
  params.set('offset', String(offset))
  params.set('limit', String(limit))
  return `/api/products?${params.toString()}`
}

const CatalogView = ({ categories = [] }) => {
  const route = useShop((state) => state.route)
  const filters = useShop((state) => state.filters)
  const setFilter = useShop((state) => state.setFilter)
  const resetFilters = useShop((state) => state.resetFilters)
  const locale = useShop((state) => state.locale)
  const t = useT()

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 400)
  const [localError, setLocalError] = useState('')
  const sentinelRef = useRef(null)

  // Синхронизация с query-параметрами хэш-маршрута (навигация из шапки/подвала)
  useEffect(() => {
    const patch = {}
    if (route.query.category) patch.category = route.query.category
    if (route.query.search !== undefined) patch.search = route.query.search
    if (route.query.discount) patch.discount = true
    if (Object.keys(patch).length) setFilter(patch)
    setSearchInput(route.query.search || '')
  }, [route.query.category, route.query.search, route.query.discount, setFilter])

  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilter({ search: debouncedSearch })
  }, [debouncedSearch])

  const fetchPage = useCallback(
    async (offset, replace) => {
      if (replace) setLoading(true)
      else setLoadingMore(true)
      try {
        const data = await API.get(buildQuery(filters, offset, 12))
        setItems((prev) => {
          if (replace) return data.items
          const known = new Set(prev.map((item) => item.id))
          return [...prev, ...data.items.filter((item) => !known.has(item.id))]
        })
        setTotal(data.total)
        setHasMore(data.hasMore)
        setLocalError('')
      } catch (error) {
        setLocalError(error.message)
        toast.error(t('toast.loadError'), { description: error.message })
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [filters, t]
  )

  // Первая страница при смене фильтров
  useEffect(() => {
    fetchPage(0, true)
  }, [fetchPage])

  // Бесконечная прокрутка: дозагрузка, когда sentinel появляется у нижнего края
  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchPage(items.length, false)
        }
      },
      { rootMargin: '420px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, items.length, fetchPage])

  const toggleSize = (size) => {
    const next = filters.sizes.includes(size) ? filters.sizes.filter((s) => s !== size) : [...filters.sizes, size]
    setFilter({ sizes: next })
  }

  const activeCategory = useMemo(
    () => categories.find((category) => category.slug === filters.category),
    [categories, filters.category]
  )

  const resetAll = () => {
    resetFilters()
    setSearchInput('')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Reveal className="mb-7">
        <h1 className="font-display text-4xl font-extrabold text-white sm:text-5xl">
          {activeCategory ? activeCategory.name : t('catalog.title')}
        </h1>
        <p className="mt-2 text-base font-semibold text-muted-foreground">
          {total > 0 ? t('catalog.items', { total }) : t('catalog.itemsShort')}
        </p>
      </Reveal>

      <Reveal className="glass-panel mb-8 p-5">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Categories">
          <button
            type="button"
            onClick={() => setFilter({ category: 'all' })}
            className={`rounded-full px-4 py-2 font-display text-sm font-bold transition-all ${
              filters.category === 'all'
                ? 'glass-btn glass-btn-primary text-white'
                : 'glass-btn glass-btn-ghost text-purple-200'
            }`}
          >
            {t('catalog.all')}
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setFilter({ category: category.slug })}
              className={`rounded-full px-4 py-2 font-display text-sm font-bold transition-all ${
                filters.category === category.slug
                  ? 'glass-btn glass-btn-primary text-white'
                  : 'glass-btn glass-btn-ghost text-purple-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-2 text-xs font-bold text-purple-200">
            <SlidersHorizontal className="h-4 w-4 text-orange-300" aria-hidden />
            {t('catalog.sort')}
            <Select value={filters.sort} onValueChange={(value) => setFilter({ sort: value })}>
              <SelectTrigger className="h-10 rounded-full border-white/20 bg-white/5 text-sm font-semibold" aria-label={t('catalog.sort')}>
                <SelectValue placeholder={t('sort.new')} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-white/15 bg-[#181335]/95 backdrop-blur-xl">
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="rounded-xl font-semibold">
                    {t(option.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex items-center gap-2 text-xs font-bold text-purple-200">
            {t('catalog.gender')}
            <Select value={filters.gender} onValueChange={(value) => setFilter({ gender: value })}>
              <SelectTrigger className="h-10 rounded-full border-white/20 bg-white/5 text-sm font-semibold" aria-label={t('catalog.gender')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-white/15 bg-[#181335]/95 backdrop-blur-xl">
                {GENDERS.map((gender) => (
                  <SelectItem key={gender.value} value={gender.value} className="rounded-xl font-semibold">
                    {t(gender.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex items-center gap-2 text-xs font-bold text-purple-200">
            {t('catalog.price')}
            <Input
              type="number"
              min={0}
              value={filters.min}
              onChange={(event) => setFilter({ min: Math.max(0, Number(event.target.value) || 0) })}
              className="h-10 rounded-full border-white/20 bg-white/5 text-sm font-semibold"
              aria-label="Min price"
            />
            <span className="text-purple-400">—</span>
            <Input
              type="number"
              min={0}
              value={filters.max}
              onChange={(event) => setFilter({ max: Number(event.target.value) || PRICE_LIMITS.max })}
              className="h-10 rounded-full border-white/20 bg-white/5 text-sm font-semibold"
              aria-label="Max price"
            />
          </label>

          <div className="flex items-center justify-between gap-3 rounded-full border border-white/20 bg-white/5 px-4 py-1.5">
            <span className="text-xs font-bold text-purple-200">{t('catalog.discountOnly')}</span>
            <Switch
              checked={filters.discount}
              onCheckedChange={(checked) => setFilter({ discount: checked })}
              aria-label={t('catalog.discountOnly')}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Sizes">
          <span className="text-xs font-bold text-purple-200">{t('catalog.sizes')}</span>
          {ALL_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => toggleSize(size)}
              aria-pressed={filters.sizes.includes(size)}
              className={`rounded-full px-3 py-1.5 font-display text-xs font-bold transition-all ${
                filters.sizes.includes(size)
                  ? 'glass-btn glass-btn-orange text-white'
                  : 'glass-btn glass-btn-ghost text-purple-200'
              }`}
            >
              {size}
            </button>
          ))}
          <button
            type="button"
            onClick={resetAll}
            className="ml-auto flex items-center gap-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-orange-300"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> {t('catalog.resetAll')}
          </button>
        </div>
      </Reveal>

      <div className="mb-6">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t('catalog.searchPlaceholder')}
          className="h-12 max-w-lg rounded-full border-white/20 bg-white/5 font-semibold"
          aria-label={t('header.search')}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="glass-card aspect-[3/4] animate-pulse" />
          ))}
        </div>
      ) : localError && !items.length ? (
        <div className="glass-panel p-8 text-center font-display text-lg font-bold text-orange-200">{localError}</div>
      ) : (
        <>
          <ProductGrid products={items} />

          {/* Маркер бесконечной подгрузки */}
          <div ref={sentinelRef} className="h-2" aria-hidden />

          <div className="mt-8 flex min-h-16 items-center justify-center" aria-live="polite">
            {loadingMore ? (
              <span className="flex items-center gap-2 font-display text-sm font-bold text-purple-300">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t('catalog.loading')}
              </span>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

export default CatalogView
