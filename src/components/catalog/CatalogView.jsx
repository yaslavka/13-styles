'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { SlidersHorizontal, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import useShop from '@/store/useShop'
import useDebounce from '@/hooks/useDebounce'
import API from '@/lib/api'
import { SORT_OPTIONS, GENDERS, CLOTHING_SIZES, SHOE_SIZES, PRICE_LIMITS } from '@/lib/constants'
import ProductGrid from '@/components/product/ProductGrid'
import PixelButton from '@/components/motion/PixelButton'
import Reveal from '@/components/motion/Reveal'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Каталог: фильтры (категория, пол, размеры, цена, скидка), сортировка, «показать ещё»

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

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 400)
  const [localError, setLocalError] = useState('')

  // Синхронизация фильтров с query-параметрами хэш-маршрута
  useEffect(() => {
    const patch = {}
    if (route.query.category) patch.category = route.query.category
    if (route.query.search !== undefined) patch.search = route.query.search
    if (Object.keys(patch).length) setFilter(patch)
    setSearchInput(route.query.search || '')
  }, [route.query.category, route.query.search])

  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilter({ search: debouncedSearch })
  }, [debouncedSearch])

  const fetchPage = useCallback(
    async (offset, replace) => {
      if (replace) setLoading(true)
      else setLoadingMore(true)
      try {
        const data = await API.get(buildQuery(filters, offset, 12))
        setItems((prev) => (replace ? data.items : [...prev, ...data.items]))
        setTotal(data.total)
        setHasMore(data.hasMore)
        setLocalError('')
      } catch (error) {
        setLocalError(error.message)
        toast.error('Не удалось загрузить каталог', { description: error.message })
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [filters]
  )

  useEffect(() => {
    fetchPage(0, true)
  }, [fetchPage])

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
      <Reveal className="mb-6">
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
          {activeCategory ? activeCategory.name : 'Каталог PIXART'}
          <span className="ml-3 text-orange-500 animate-blink">▞</span>
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {total > 0 ? `${total} товаров` : 'Пиксельная коллекция для 16–50 лет'} · фильтры и сортировка работают мгновенно
        </p>
      </Reveal>

      <Reveal className="pixel-corners mb-8 border border-purple-500/25 bg-card/70 p-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Категории">
          <button
            type="button"
            onClick={() => setFilter({ category: 'all' })}
            className={`pixel-corners-sm px-3 py-1.5 font-display text-sm transition-colors ${
              filters.category === 'all' ? 'bg-gradient-to-r from-purple-600 to-orange-500 text-white' : 'border border-purple-500/30 text-purple-200 hover:bg-purple-500/15'
            }`}
          >
            Все
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setFilter({ category: category.slug })}
              className={`pixel-corners-sm px-3 py-1.5 font-display text-sm transition-colors ${
                filters.category === category.slug
                  ? 'bg-gradient-to-r from-purple-600 to-orange-500 text-white'
                  : 'border border-purple-500/30 text-purple-200 hover:bg-purple-500/15'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-2 text-xs text-purple-200">
            <SlidersHorizontal className="h-4 w-4 text-orange-400" aria-hidden />
            Сортировка
            <Select value={filters.sort} onValueChange={(value) => setFilter({ sort: value })}>
              <SelectTrigger className="h-9 border-purple-500/30 bg-[#0d0c1c] text-sm" aria-label="Сортировка">
                <SelectValue placeholder="Новинки" />
              </SelectTrigger>
              <SelectContent className="border-purple-500/30 bg-[#10101f]">
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-sm">
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex items-center gap-2 text-xs text-purple-200">
            Кто
            <Select value={filters.gender} onValueChange={(value) => setFilter({ gender: value })}>
              <SelectTrigger className="h-9 border-purple-500/30 bg-[#0d0c1c] text-sm" aria-label="Пол">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-purple-500/30 bg-[#10101f]">
                {GENDERS.map((gender) => (
                  <SelectItem key={gender.value} value={gender.value} className="text-sm">
                    {gender.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex items-center gap-2 text-xs text-purple-200">
            Цена ₽
            <Input
              type="number"
              min={0}
              value={filters.min}
              onChange={(event) => setFilter({ min: Math.max(0, Number(event.target.value) || 0) })}
              className="h-9 border-purple-500/30 bg-[#0d0c1c] text-sm"
              aria-label="Минимальная цена"
            />
            <span className="text-purple-400">—</span>
            <Input
              type="number"
              min={0}
              value={filters.max}
              onChange={(event) => setFilter({ max: Number(event.target.value) || PRICE_LIMITS.max })}
              className="h-9 border-purple-500/30 bg-[#0d0c1c] text-sm"
              aria-label="Максимальная цена"
            />
          </label>

          <div className="flex items-center justify-between gap-3 rounded-md border border-purple-500/30 bg-[#0d0c1c] px-3 py-1.5">
            <span className="text-xs text-purple-200">Только со скидкой</span>
            <Switch
              checked={filters.discount}
              onCheckedChange={(checked) => setFilter({ discount: checked })}
              aria-label="Только товары со скидкой"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Размеры">
          <span className="text-xs text-purple-200">Размеры:</span>
          {ALL_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => toggleSize(size)}
              aria-pressed={filters.sizes.includes(size)}
              className={`pixel-corners-sm px-2.5 py-1 font-display text-xs transition-colors ${
                filters.sizes.includes(size)
                  ? 'bg-orange-500 text-white'
                  : 'border border-purple-500/30 text-purple-200 hover:bg-purple-500/15'
              }`}
            >
              {size}
            </button>
          ))}
          <button
            type="button"
            onClick={resetAll}
            className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-orange-300"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Сбросить всё
          </button>
        </div>
      </Reveal>

      <div className="mb-5">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Найти: худи, кроссовки, рюкзак…"
          className="h-11 max-w-md border-purple-500/30 bg-[#0d0c1c]"
          aria-label="Поиск по каталогу"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="pixel-corners aspect-[3/4] animate-pulse bg-card/60" />
          ))}
        </div>
      ) : localError && !items.length ? (
        <div className="pixel-corners border border-orange-500/40 bg-orange-500/10 p-8 text-center font-display text-orange-200">
          {localError}
        </div>
      ) : (
        <>
          <ProductGrid products={items} />
          {hasMore ? (
            <div className="mt-8 flex justify-center">
              <PixelButton tone="dark" className="h-11 px-8" disabled={loadingMore} onClick={() => fetchPage(items.length, false)}>
                {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Показать ещё
              </PixelButton>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

export default CatalogView
