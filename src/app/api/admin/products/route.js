import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ADMIN from '@/lib/admin'
import CACHE from '@/lib/cache'
import DTO from '@/lib/dto'
import { slugify } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const GENDER_VALUES = ['men', 'women', 'unisex']
const LABEL_VALUES = ['none', 'new', 'hit', 'sale']
const MAX_NAME_LENGTH = 120
const MAX_SLUG_ATTEMPTS = 5
const MAX_FETCH_ROWS = 500

// Массив строк из тела запроса: не-массив -> [], мусор отфильтровываем, лимит опционален
const cleanStringArray = (value, maxItems) => {
  if (!Array.isArray(value)) return []
  const cleaned = value
    .filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
    .map((entry) => entry.trim())
  return Number.isInteger(maxItems) && maxItems > 0 ? cleaned.slice(0, maxItems) : cleaned
}

const normalizeStock = (value, fallback = 10) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(0, Math.floor(num))
}

const normalizeRating = (value, fallback = 4.8) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(5, Math.max(0, num))
}

const normalizeReviews = (value, fallback = 0) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(0, Math.floor(num))
}

// GET /api/admin/products — полный список товаров (включая неопубликованные)
const GET = async (request) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rows = await db.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { category: true },
      take: MAX_FETCH_ROWS,
    })
    return NextResponse.json({ items: rows.map((row) => DTO.toProductDTO(row)) })
  } catch (error) {
    console.error('[api/admin/products] ошибка загрузки товаров:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось загрузить список товаров' }, { status: 500 })
  }
}

// POST /api/admin/products — создание товара с валидацией и уникальным slug
const POST = async (request) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 })
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (name.length < 2 || name.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: 'Название товара должно содержать от 2 до 120 символов' }, { status: 400 })
    }

    const price = Number(body.price)
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'Цена должна быть числом больше нуля' }, { status: 400 })
    }

    const categoryId = Number(body.categoryId)
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: 'Не указана категория товара' }, { status: 400 })
    }
    const categoryRow = await db.category.findUnique({ where: { id: categoryId } })
    if (!categoryRow) {
      return NextResponse.json({ error: 'Указанная категория не найдена' }, { status: 400 })
    }

    // Slug: явный -> транслитерация, иначе из названия; конфликт решаем коротким случайным суффиксом
    const baseSlug = typeof body.slug === 'string' && body.slug.trim().length > 0 ? slugify(body.slug.trim()) : slugify(name)
    let slug = baseSlug
    let slugTaken = await db.product.findUnique({ where: { slug } })
    let attempts = 0
    while (slugTaken && attempts < MAX_SLUG_ATTEMPTS) {
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
      slugTaken = await db.product.findUnique({ where: { slug } })
      attempts += 1
    }
    if (slugTaken) {
      return NextResponse.json({ error: 'Не удалось подобрать уникальный slug для товара' }, { status: 400 })
    }

    const oldPriceRaw = Number(body.oldPrice)
    const oldPrice = Number.isFinite(oldPriceRaw) && oldPriceRaw > price ? oldPriceRaw : null

    const gender = GENDER_VALUES.includes(body.gender) ? body.gender : 'unisex'
    const label = LABEL_VALUES.includes(body.label) ? body.label : 'none'
    const sizes = cleanStringArray(body.sizes, 12)
    const colors = cleanStringArray(body.colors)
    const images = cleanStringArray(body.images, 8)
    const stock = normalizeStock(body.stock)
    const rating = normalizeRating(body.rating)
    const reviews = normalizeReviews(body.reviews)
    const featured = body.featured === true
    const published = body.published === undefined ? true : body.published === true
    const shortDesc = typeof body.shortDesc === 'string' ? body.shortDesc.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''

    const created = await db.product.create({
      data: {
        slug,
        name,
        shortDesc,
        description,
        price,
        oldPrice,
        gender,
        label,
        sizes: JSON.stringify(sizes),
        colors: JSON.stringify(colors),
        images: JSON.stringify(images),
        stock,
        rating,
        reviews,
        featured,
        published,
        categoryId,
      },
      include: { category: true },
    })

    await CACHE.invalidatePrefix('products')
    await CACHE.invalidatePrefix('categories')

    return NextResponse.json({ product: DTO.toProductDTO(created) }, { status: 201 })
  } catch (error) {
    console.error('[api/admin/products] ошибка создания товара:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось создать товар' }, { status: 500 })
  }
}

export { GET, POST }
