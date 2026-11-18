'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronRight, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import useShop from '@/store/useShop'
import useDebounce from '@/hooks/useDebounce'
import useInfiniteList from '@/hooks/useInfiniteList'
import useT from '@/hooks/useT'
import API from '@/lib/api'
import { SORT_OPTIONS, GENDERS, CLOTHING_SIZES, SHOE_SIZES, PRICE_LIMITS } from '@/lib/constants'
import ProductGrid from '@/components/product/ProductGrid'
import Reveal from '@/components/motion/Reveal'
import { ProductGridSkeleton } from '@/components/ui/card-skeleton'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'

// Каталог 13 STYLES: фильтры по ВСЕМ параметрам — липкий сайдбар слева на десктопе
// и боттомщит (Drawer, side=bottom) на мобильных. Категории/подкатегории — ссылки на
// SEO-страницы (/catalog/category/[slug]...), остальные параметры (поиск, пол, цена,
// размеры, бейджи, скидка, рейтинг, сортировка) работают через /api/products и живут
// в persist-сторе useShop. Фильтры применяются мгновенно, кнопка Apply просто закрывает щит.

const LABEL_FILTERS = ['new', 'hit', 'sale']
const RATING_OPTIONS = [0, 4.5, 4.8]

const CHIP_ACTIVE = 'glass-btn glass-btn-primary text-white'
const CHIP_ACTIVE_ORANGE = 'glass-btn glass-btn-orange text-white'
const CHIP_GHOST = 'glass-btn glass-btn-ghost text-purple-200'

// Кнопка фильтра «как в админке»: во всю ширину сайдбара, в столбик,
// с сохранённым стеклянным фоном и бордером (glass-btn-ghost / primary / orange)
const ROW_CLASS = (active, tone = 'primary') =>
  `flex w-full items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-left font-display text-sm font-bold transition-all ${
    active ? (tone === 'orange' ? CHIP_ACTIVE_ORANGE : CHIP_ACTIVE) : CHIP_GHOST
  }`

// Заголовок секции фильтров: маленький, верхний регистр, жирный
const SectionTitle = ({ children }) => (
  <h3 className="mb-2.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-purple-200">{children}</h3>
)

const CatalogView = ({ categories = [], lockedCategory = null, lockedSub = null }) => {
  const filters = useShop((state) => state.filters)
  const setFilter = useShop((state) => state.setFilter)
  const resetFilters = useShop((state) => state.resetFilters)
  const navigate = useShop((state) => state.navigate)
  const searchParams = useSearchParams()
  const t = useT()

  const urlSearch = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(urlSearch)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const debouncedSearch = useDebounce(searchInput, 400)

  // Подхват поисковой фразы при внешней навигации (шапка/подвал) —
  // синхронизация правкой состояния прямо в рендере (паттерн React docs)
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch)
  if (lastUrlSearch !== urlSearch) {
    setLastUrlSearch(urlSearch)
    setSearchInput(urlSearch)
  }

  useEffect(() => {
    // Читаем актуальный стор через getState(): депсы только по debouncedSearch,
    // чтобы сброс фильтров не перезаписывал поисковую фразу обратно
    if (debouncedSearch !== useShop.getState().filters.search) setFilter({ search: debouncedSearch })
  }, [debouncedSearch, setFilter])

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
      if ((filters.rating || 0) > 0) params.set('rating', String(filters.rating))
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

  const activeRating = filters.rating || 0

  // Счётчик активных фильтров (бейдж на плавающей кнопке и в шапке щита)
  const activeCount =
    (filters.sizes?.length || 0) +
    (filters.gender && filters.gender !== 'all' ? 1 : 0) +
    (filters.label && filters.label !== 'all' ? 1 : 0) +
    (filters.discount ? 1 : 0) +
    (activeRating > 0 ? 1 : 0) +
    (filters.min > PRICE_LIMITS.min || filters.max < PRICE_LIMITS.max ? 1 : 0) +
    (searchInput || filters.search ? 1 : 0)

  // Заголовок страницы: подкатегория (если открыта её SEO-страница) или категория
  const activeSubcategory = lockedSub && activeCategory
    ? (activeCategory.subcategories || []).find((sub) => sub.slug === lockedSub) || null
    : null
  const heading = activeSubcategory
    ? activeSubcategory.name
    : activeCategory
      ? activeCategory.name
      : t('catalog.title')
  const subHeading = activeSubcategory
    ? activeCategory.subtitle
    : activeCategory
      ? activeCategory.subtitle
      : t('catalog.itemsShort')

  const resetAll = () => {
    resetFilters()
    setSearchInput('')
  }

  // Единый набор секций фильтров: рендерится в сайдбаре (десктоп) и в боттомщите (мобильные).
  // withSort добавляет секцию сортировки внутрь мобильного щита (на десктопе сортировка живёт в тулбаре над сеткой).
  const renderFilters = ({ withSort = false } = {}) => {
    const groupsWithSubs = categories.filter((category) => category.subcategories?.length)

    return (
      <div className="space-y-5">
        {withSort ? (
          <section aria-label={t('catalog.sort')}>
            <SectionTitle>{t('catalog.sort')}</SectionTitle>
            <Select value={filters.sort} onValueChange={(value) => setFilter({ sort: value })}>
              <SelectTrigger
                className="h-10 w-full rounded-full border-white/20 bg-white/5 text-sm font-semibold"
                aria-label={t('catalog.sort')}
              >
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
          </section>
        ) : null}

        {/* Поиск */}
        <section aria-label={t('catalog.search')}>
          <SectionTitle>{t('catalog.search')}</SectionTitle>
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t('catalog.searchPlaceholder')}
            className="h-10 rounded-full border-white/20 bg-white/5 text-sm font-semibold"
            aria-label={t('header.search')}
          />
        </section>

        {/* Категории — ссылки на SEO-страницы, кнопки в столбик как в админке */}
        <section aria-label={t('catalog.categories')}>
          <SectionTitle>{t('catalog.categories')}</SectionTitle>
          <div role="group" aria-label={t('catalog.categories')} className="flex flex-col gap-1.5">
            <button type="button" onClick={() => navigate('catalog')} aria-pressed={!lockedCategory} className={ROW_CLASS(!lockedCategory)}>
              {t('catalog.all')}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => navigate('category', { slug: category.slug })}
                aria-pressed={lockedCategory === category.slug}
                className={ROW_CLASS(lockedCategory === category.slug)}
              >
                {category.name}
                <span className="text-xs font-semibold opacity-70">{category.count ?? ''}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Подкатегории: столбик кнопок — на залоченной странице одна группа, на /catalog — раскрывающиеся группы по категориям */}
        {lockedCategory ? (
          <section aria-label={t('catalog.subcategories')}>
            <SectionTitle>{t('catalog.subcategories')}</SectionTitle>
            <div role="group" aria-label={t('catalog.subcategories')} className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => navigate('category', { slug: lockedCategory })}
                aria-pressed={!lockedSub}
                className={ROW_CLASS(!lockedSub, 'orange')}
              >
                {t('category.allSubcategories')}
              </button>
              {(activeCategory?.subcategories || []).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => navigate('subcategory', { slug: lockedCategory, sub: sub.slug })}
                  aria-pressed={lockedSub === sub.slug}
                  className={ROW_CLASS(lockedSub === sub.slug, 'orange')}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </section>
        ) : groupsWithSubs.length ? (
          <section aria-label={t('catalog.subcategories')}>
            <details className="group rounded-2xl border border-white/10 bg-white/5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-purple-200 transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
                {t('catalog.subcategories')}
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="scrollbar-glass max-h-72 space-y-4 overflow-y-auto px-3 pb-4 pt-1">
                {groupsWithSubs.map((category) => (
                  <div key={category.id}>
                    <p className="px-1.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-300/80">{category.name}</p>
                    <div className="flex flex-col gap-1.5">
                      {category.subcategories.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => navigate('subcategory', { slug: category.slug, sub: sub.slug })}
                          className="glass-btn glass-btn-ghost flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 text-left font-display text-sm font-bold text-purple-200 transition-all hover:text-white"
                        >
                          {sub.name}
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-orange-300/70" aria-hidden />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </section>
        ) : null}

        {/* Пол — кнопки в столбик как в админке */}
        <section aria-label={t('catalog.gender')}>
          <SectionTitle>{t('catalog.gender')}</SectionTitle>
          <div role="group" aria-label={t('catalog.gender')} className="flex flex-col gap-1.5">
            {GENDERS.map((gender) => (
              <button
                key={gender.value}
                type="button"
                onClick={() => setFilter({ gender: gender.value })}
                aria-pressed={filters.gender === gender.value}
                className={ROW_CLASS(filters.gender === gender.value)}
              >
                {t(gender.key)}
              </button>
            ))}
          </div>
        </section>

        {/* Цена: мин/макс с ограничением PRICE_LIMITS */}
        <section aria-label={t('catalog.price')}>
          <SectionTitle>{t('catalog.price')}</SectionTitle>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={PRICE_LIMITS.min}
              max={PRICE_LIMITS.max}
              value={filters.min}
              onChange={(event) => {
                const parsed = Number(event.target.value)
                const safe = Number.isFinite(parsed) ? parsed : PRICE_LIMITS.min
                setFilter({ min: Math.min(Math.max(PRICE_LIMITS.min, safe), PRICE_LIMITS.max) })
              }}
              className="h-10 rounded-full border-white/20 bg-white/5 text-sm font-semibold"
              aria-label={t('catalog.priceMin')}
            />
            <span className="text-purple-400" aria-hidden>
              —
            </span>
            <Input
              type="number"
              min={PRICE_LIMITS.min}
              max={PRICE_LIMITS.max}
              value={filters.max}
              onChange={(event) => {
                const raw = event.target.value
                const parsed = Number(raw)
                const safe = raw === '' || !Number.isFinite(parsed) ? PRICE_LIMITS.max : parsed
                setFilter({ max: Math.min(PRICE_LIMITS.max, Math.max(PRICE_LIMITS.min, safe)) })
              }}
              className="h-10 rounded-full border-white/20 bg-white/5 text-sm font-semibold"
              aria-label={t('catalog.priceMax')}
            />
          </div>
        </section>

        {/* Размеры: одежда + обувь — кнопки в столбик как в админке */}
        <section aria-label={t('catalog.sizes')}>
          <SectionTitle>{t('catalog.sizes')}</SectionTitle>
          <div role="group" aria-label={t('catalog.sizes')} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              {CLOTHING_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  aria-pressed={filters.sizes.includes(size)}
                  className={ROW_CLASS(filters.sizes.includes(size), 'orange')}
                >
                  {size}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <span className="px-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-300/70">
                {t('catalog.sizeShoes')}
              </span>
              <div className="flex flex-col gap-1.5">
                {SHOE_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    aria-pressed={filters.sizes.includes(size)}
                    className={ROW_CLASS(filters.sizes.includes(size), 'orange')}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Бейджи NEW / TOP / SALE — кнопки в столбик (повторный клик снимает выбор) */}
        <section aria-label={t('catalog.badges')}>
          <SectionTitle>{t('catalog.badges')}</SectionTitle>
          <div role="group" aria-label={t('catalog.badges')} className="flex flex-col gap-1.5">
            {LABEL_FILTERS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setFilter({ label: filters.label === label ? 'all' : label })}
                aria-pressed={filters.label === label}
                className={ROW_CLASS(filters.label === label, 'orange')}
              >
                {label.toUpperCase()}
              </button>
            ))}
          </div>
        </section>

        {/* Только со скидкой — кнопка-переключатель во всю ширину, как в админке */}
        <section aria-label={t('catalog.discountOnly')}>
          <button
            type="button"
            role="switch"
            aria-checked={filters.discount}
            onClick={() => setFilter({ discount: !filters.discount })}
            className={ROW_CLASS(filters.discount, 'orange')}
          >
            <span>{t('catalog.discountOnly')}</span>
            <span
              aria-hidden
              className={`h-5 w-9 rounded-full border transition-colors ${filters.discount ? 'border-orange-300/70 bg-orange-400/80' : 'border-white/25 bg-white/10'}`}
            >
              <span
                className={`block h-4 w-4 translate-y-[1px] rounded-full bg-white shadow transition-transform ${filters.discount ? 'translate-x-[17px]' : 'translate-x-[2px]'}`}
              />
            </span>
          </button>
        </section>

        {/* Минимальный рейтинг — кнопки в столбик */}
        <section aria-label={t('catalog.rating')}>
          <SectionTitle>{t('catalog.rating')}</SectionTitle>
          <div role="group" aria-label={t('catalog.rating')} className="flex flex-col gap-1.5">
            {RATING_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter({ rating: value })}
                aria-pressed={activeRating === value}
                className={ROW_CLASS(activeRating === value, 'orange')}
              >
                {value === 0 ? t('catalog.ratingAny') : `${value}+`}
              </button>
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 lg:pb-16">
      <Reveal className="mb-7">
        <h1 className="font-display text-4xl font-extrabold text-white sm:text-5xl">{heading}</h1>
        <p className="mt-2 text-base font-semibold text-muted-foreground">
          {total > 0 ? t('catalog.items', { total }) : subHeading}
        </p>
      </Reveal>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* САЙДБАР ФИЛЬТРОВ (десктоп): липкий, с внутренним скроллом */}
        <aside className="hidden w-80 shrink-0 self-start lg:sticky lg:top-[96px] lg:block" aria-label={t('catalog.filters')}>
          <div className="glass-panel scrollbar-glass max-h-[calc(100vh-7.5rem)] overflow-y-auto p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.2em] text-white">
                <SlidersHorizontal className="h-4 w-4 text-orange-300" aria-hidden />
                {t('catalog.filters')}
              </h2>
              <button
                type="button"
                onClick={resetAll}
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-orange-300"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {t('catalog.resetAll')}
              </button>
            </div>
            {renderFilters()}
          </div>
        </aside>

        {/* Товары: тулбар (счётчик + сортировка) над сеткой на всех экранах */}
        <section className="min-w-0 flex-1" aria-label={heading}>
          <Reveal className="glass-panel mb-6 flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <p className="min-h-5 text-sm font-semibold text-muted-foreground" aria-live="polite">
              {total > 0 ? t('catalog.items', { total }) : ''}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-[11px] font-bold uppercase tracking-widest text-purple-200 sm:inline">
                {t('catalog.sort')}
              </span>
              <Select value={filters.sort} onValueChange={(value) => setFilter({ sort: value })}>
                <SelectTrigger
                  className="h-9 rounded-full border-white/20 bg-white/5 text-xs font-semibold"
                  aria-label={t('catalog.sort')}
                >
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
            </div>
          </Reveal>

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
        </section>
      </div>

      {/* Плавающая кнопка фильтров (мобильные) с бейджем активных фильтров */}
      <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={`${t('catalog.filters')}${activeCount > 0 ? ` (${activeCount})` : ''}`}
          className="glass-btn glass-btn-orange flex items-center gap-2 rounded-full px-6 py-3 font-display text-sm font-bold text-white shadow-[0_12px_30px_rgba(249,115,22,0.45)]"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {t('catalog.filters')}
          {activeCount > 0 ? (
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1.5 text-xs font-extrabold text-orange-500">
              {activeCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* БОТТОМЩИТ ФИЛЬТРОВ (мобильные): скролл-контент + липкий футер с Apply / Clear all */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh] rounded-t-[1.6rem] border-white/15 bg-[#150f2e]/95 backdrop-blur-2xl">
          <DrawerHeader className="shrink-0 border-b border-white/10 pb-3">
            <DrawerTitle className="flex items-center justify-center gap-2 font-display text-sm font-bold uppercase tracking-[0.2em] text-white">
              <SlidersHorizontal className="h-4 w-4 text-orange-300" aria-hidden />
              {t('catalog.filters')}
              {activeCount > 0 ? (
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-orange-500/90 px-1.5 text-xs font-extrabold text-white">
                  {activeCount}
                </span>
              ) : null}
            </DrawerTitle>
            <DrawerDescription className="sr-only">{t('catalog.filters')}</DrawerDescription>
          </DrawerHeader>

          <div className="scrollbar-glass min-h-0 flex-1 overflow-y-auto px-4 py-5">{renderFilters({ withSort: true })}</div>

          <DrawerFooter className="shrink-0 flex-row gap-3 border-t border-white/10 bg-[#150f2e]/95 px-4 py-4">
            <button
              type="button"
              onClick={() => {
                resetAll()
                setDrawerOpen(false)
              }}
              className="glass-btn glass-btn-ghost flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full font-display text-sm font-bold text-purple-200"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              {t('catalog.clearFilters')}
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="glass-btn glass-btn-primary flex h-11 flex-1 items-center justify-center rounded-full font-display text-sm font-bold text-white"
            >
              {t('catalog.showResults')}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

export default CatalogView
