'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import useShop from '@/store/useShop'
import useDebounce from '@/hooks/useDebounce'
import useInfiniteList from '@/hooks/useInfiniteList'
import useT from '@/hooks/useT'
import API from '@/lib/api'
import { SORT_OPTIONS, GENDERS, CLOTHING_SIZES, SHOE_SIZES, PRICE_LIMITS, PAGE_SIZE } from '@/lib/constants'
import ProductGrid from '@/components/product/ProductGrid'
import Reveal from '@/components/motion/Reveal'
import { ProductGridSkeleton } from '@/components/ui/card-skeleton'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Каталог: сохраняемые фильтры, сортировка, бесконечная подгрузка карточек по скроллу.
// Категории/подкатегории — отдельные SEO-страницы (/catalog/category/[slug]...),
// остальные параметры (цена, размеры, лейблы, пол, скидка, поиск) — через /api/products.

const ALL_SIZES = [...CLOTHING_SIZES, ...SHOE_SIZES]
const LABEL_FILTERS = ['new', 'hit', 'sale']

const CatalogView = ({ categories = [], lockedCategory = null, lockedSub = null }) => {
  const filters = useShop((state) => state.filters)
  const setFilter = useShop((state) => state.setFilter)
  const resetFilters = useShop((state) => state.resetFilters)
  const navigate = useShop((state) => state.navigate)
  const href = useShop((state) => state.href)
  const searchParams = useSearchParams()
  const t = useT()

  const urlSearch = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(urlSearch)
  const debouncedSearch = useDebounce(searchInput, 400)

  // Подхват поисковой фразы при внешней навигации (шапка/подвал)
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch)
  if (lastUrlSearch !== urlSearch) {
    setLastUrlSearch(urlSearch)
    setSearchInput(urlSearch)
  }

  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilter({ search: debouncedSearch })
  }, [debouncedSearch])

  const buildUrl = useCallback(
    (offset, pageSize) => {
      const params = new URLSearchParams()
      if (lockedCategory) params.set('category', lockedCategory)
      else if (filters.category && filters.category !== 'all') params.set('category', filters.category)
      if (lockedSub) params.set('sub', lockedSub)
      if (filters.gender && filters.gender !== 'all') params.set('gender', filters.gender)
      if (filters.search) params.set('search', filters.search)
      if (filters.sort && filters.sort !== 'new') params.set('sort', filters.sort)
      if (filters.label && filters.label !== 'all') params.set('label', filters.label)
      if (filters.min > PRICE_LIMITS.min) params.set('min', String(filters.min))
      if (filters.max < PRICE_LIMITS.max) params.set('max', String(filters.max))
      if (filters.sizes?.length) params.set('sizes', filters.sizes.join(','))
      if (filters.discount) params.set('discount', '1')
      params.set('offset', String(offset))
      params.set('limit', String(pageSize))
      return `/api/products?${params.toString()}`
    },
    [filters, lockedCategory, lockedSub]
  )

  const { items, total, loading, loadingMore, hasMore, sentinelRef } = useInfiniteList({
    buildUrl,
    fetcher: API.get,
    onError: (error) => toast.error(t('toast.loadError'), { description: error.message }),
  })

  const toggleSize = (size) => {
    const next = filters.sizes.includes(size) ? filters.sizes.filter((s) => s !== size) : [...filters.sizes, size]
    setFilter({ sizes: next })
  }

  const activeCategory = useMemo(
    () => categories.find((category) => category.slug === (lockedCategory || filters.category)),
    [categories, lockedCategory, filters.category]
  )

  const heading = activeCategory ? activeCategory.name : t('catalog.title')
  const subHeading = activeCategory ? activeCategory.subtitle : t('catalog.itemsShort')

  const resetAll = () => {
    resetFilters()
    setSearchInput('')
  }

  const chip = (active) =>
    `rounded-full px-4 py-2 font-display text-sm font-bold transition-all ${
      active ? 'glass-btn glass-btn-primary text-white' : 'glass-btn glass-btn-ghost text-purple-200'
    }`

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Reveal className="mb-7">
        <h1 className="font-display text-4xl font-extrabold text-white sm:text-5xl">{heading}</h1>
        <p className="mt-2 text-base font-semibold text-muted-foreground">
          {total > 0 ? t('catalog.items', { total }) : subHeading}
        </p>
      </Reveal>

      {/* Категории и подкатегории — ссылки на SEO-страницы */}
      <Reveal className="glass-panel mb-8 p-5">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Categories">
          <button type="button" onClick={() => navigate('catalog')} className={chip(!lockedCategory)}>
            {t('catalog.all')}
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => navigate('category', { slug: category.slug })}
              className={chip(lockedCategory === category.slug)}
            >
              {category.name}
            </button>
          ))}
        </div>

        {lockedCategory && activeCategory?.subcategories?.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Subcategories">
            <button type="button" onClick={() => navigate('category', { slug: lockedCategory })} className={chip(!lockedSub)}>
              {t('catalog.all')}
            </button>
            {activeCategory.subcategories.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => navigate('subcategory', { slug: lockedCategory, sub: sub.slug })}
                className={`rounded-full px-3 py-1.5 font-display text-xs font-bold transition-all ${
                  lockedSub === sub.slug ? 'glass-btn glass-btn-orange text-white' : 'glass-btn glass-btn-ghost text-purple-200'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex items-center gap-2 text-xs font-bold text-purple-200">
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

        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Badges">
          <span className="text-xs font-bold text-purple-200">NEW / TOP / SALE</span>
          {LABEL_FILTERS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setFilter({ label: filters.label === label ? 'all' : label })}
              aria-pressed={filters.label === label}
              className={`rounded-full px-3 py-1.5 font-display text-xs font-bold uppercase transition-all ${
                filters.label === label ? 'glass-btn glass-btn-orange text-white' : 'glass-btn glass-btn-ghost text-purple-200'
              }`}
            >
              {label}
            </button>
          ))}
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
        <ProductGridSkeleton count={8} />
      ) : (
        <>
          {items.length === 0 ? (
            <div className="glass-panel mx-auto max-w-xl p-10 text-center">
              <p className="font-display text-xl font-bold text-white">{t('catalog.emptyTitle')}</p>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('catalog.emptyText')}</p>
            </div>
          ) : (
            <ProductGrid products={items} />
          )}

          {/* Маркер бесконечной подгрузки */}
          <div ref={sentinelRef} className="h-2" aria-hidden />

          {/* Скелеты следующей партии карточек */}
          {loadingMore ? <ProductGridSkeleton count={4} /> : null}

          <div className="mt-6 flex min-h-10 items-center justify-center" aria-live="polite">
            {!loadingMore && !hasMore && items.length > 0 ? (
              <span className="font-display text-sm font-bold text-purple-300">{t('catalog.loadedAll')}</span>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

export default CatalogView
