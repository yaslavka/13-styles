import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import CACHE from '@/lib/cache'
import DTO from '@/lib/dto'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const GENDER_VALUES = ['all', 'men', 'women', 'unisex']
const SORT_VALUES = ['new', 'price-asc', 'price-desc', 'discount', 'rating']
const MAX_FETCH_ROWS = 500
const MAX_LIMIT = 50
const MAX_PRICE = 999999

// Числовой query-параметр с безопасным fallback (пустая строка и null не превращаются в 0)
const toNumberParam = (raw, fallback) => {
  if (raw === null || raw === undefined || raw === '') return fallback
  const num = Number(raw)
  return Number.isFinite(num) ? num : fallback
}

const parseLimit = (raw) => {
  const num = toNumberParam(raw, DEFAULT_PAGE_SIZE)
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(num)))
}

const parseOffset = (raw) => {
  const num = toNumberParam(raw, 0)
  return num <= 0 ? 0 : Math.floor(num)
}

// Поиск по названию/краткому/полному описанию без учета регистра (русский текст)
const matchesSearch = (item, query) => {
  const name = String(item.name || '').toLowerCase()
  const shortDesc = String(item.shortDesc || '').toLowerCase()
  const description = String(item.description || '').toLowerCase()
  return name.includes(query) || shortDesc.includes(query) || description.includes(query)
}

// Пересечение размеров товара с запрошенными
const matchesSizes = (item, requested) => {
  const productSizes = (item.sizes || []).map((entry) => String(entry))
  return requested.some((size) => productSizes.includes(size))
}

// GET /api/products — публичный список товаров с фильтрами, поиском и сортировкой
const GET = async (request) => {
  try {
    const { searchParams } = new URL(request.url)

    const categoryParam = String(searchParams.get('category') || 'all').trim().toLowerCase()
    const categorySlug = categoryParam.length > 0 && categoryParam !== 'all' ? categoryParam : ''

    const genderRaw = String(searchParams.get('gender') || 'all').trim().toLowerCase()
    const gender = GENDER_VALUES.includes(genderRaw) ? genderRaw : 'all'

    const sortRaw = String(searchParams.get('sort') || 'new').trim().toLowerCase()
    const sort = SORT_VALUES.includes(sortRaw) ? sortRaw : 'new'

    const search = String(searchParams.get('search') || '').trim()
    const minNum = toNumberParam(searchParams.get('min'), 0)
    const maxNum = toNumberParam(searchParams.get('max'), MAX_PRICE)
    const discountOn = searchParams.get('discount') === '1'
    const featuredOn = searchParams.get('featured') === '1'
    const requestedSizes = String(searchParams.get('sizes') || '')
      .split(',')
      .map((size) => size.trim())
      .filter((size) => size.length > 0)

    const limit = parseLimit(searchParams.get('limit'))
    const offset = parseOffset(searchParams.get('offset'))

    // Кэшируем только выборку из БД (до поиска/сортировки/нарезки) — это самая дорогая часть
    const cacheKey = `products:v1:${JSON.stringify({
      category: categorySlug,
      gender,
      discount: discountOn ? 1 : 0,
      featured: featuredOn ? 1 : 0,
      min: minNum,
      max: maxNum,
    })}`

    const catalog = await CACHE.wrap(cacheKey, 20000, async () => {
      let categoryId = 0
      if (categorySlug) {
        const categoryRow = await db.category.findUnique({ where: { slug: categorySlug }, select: { id: true } })
        if (!categoryRow) return []
        categoryId = categoryRow.id
      }

      const where = { published: true }
      if (categoryId > 0) where.categoryId = categoryId
      if (gender !== 'all') where.gender = gender
      if (featuredOn) where.featured = true

      const andConditions = []
      if (discountOn) andConditions.push({ oldPrice: { not: null } })
      if (minNum > 0) andConditions.push({ price: { gte: minNum } })
      if (maxNum > 0 && maxNum < MAX_PRICE) andConditions.push({ price: { lte: maxNum } })
      if (andConditions.length > 0) where.AND = andConditions

      const rows = await db.product.findMany({
        where,
        include: { category: true },
        take: MAX_FETCH_ROWS,
        orderBy: { createdAt: 'desc' },
      })

      return rows.map((row) => DTO.toProductDTO(row))
    })

    // Пост-фильтры поверх закэшированной выборки
    let filtered = catalog

    if (discountOn) {
      filtered = filtered.filter((item) => item.oldPrice !== null && item.oldPrice > item.price)
    }

    if (search.length > 0) {
      const query = search.toLowerCase()
      filtered = filtered.filter((item) => matchesSearch(item, query))
    }

    if (requestedSizes.length > 0) {
      filtered = filtered.filter((item) => matchesSizes(item, requestedSizes))
    }

    // Сортировка на копии массива, чтобы не мутировать закэшированное значение
    let result = filtered
    if (sort === 'price-asc') {
      result = [...filtered].sort((a, b) => a.price - b.price)
    } else if (sort === 'price-desc') {
      result = [...filtered].sort((a, b) => b.price - a.price)
    } else if (sort === 'discount') {
      result = [...filtered].sort((a, b) => b.discountPercent - a.discountPercent)
    } else if (sort === 'rating') {
      result = [...filtered].sort((a, b) => b.rating - a.rating)
    }
    // 'new' — сортировка по createdAt desc уже сделана на уровне БД

    const total = result.length
    const items = result.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    return NextResponse.json({ items, total, hasMore })
  } catch (error) {
    console.error('[api/products] ошибка загрузки списка товаров:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось загрузить список товаров' }, { status: 500 })
  }
}

export { GET }
