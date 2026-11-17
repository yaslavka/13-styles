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

const parseId = (raw) => {
  const num = parseInt(raw, 10)
  return Number.isNaN(num) ? null : num
}

const invalidateCatalogCache = async () => {
  await CACHE.invalidatePrefix('products')
  await CACHE.invalidatePrefix('categories')
}

// PUT /api/admin/products/[id] — частичное обновление товара
const PUT = async (request, context) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const params = await context.params
    const id = parseId(params?.id)
    if (id === null) {
      return NextResponse.json({ error: 'Некорректный идентификатор товара' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 })
    }

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }

    const data = {}

    // Название: применяем ту же валидацию, что и при создании
    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (name.length < 2 || name.length > MAX_NAME_LENGTH) {
        return NextResponse.json({ error: 'Название товара должно содержать от 2 до 120 символов' }, { status: 400 })
      }
      data.name = name
    }

    // Slug: транслитерация + проверка уникальности без учета самого себя
    if (typeof body.slug === 'string' && body.slug.trim().length > 0) {
      const nextSlug = slugify(body.slug.trim())
      if (nextSlug !== existing.slug) {
        const taken = await db.product.findUnique({ where: { slug: nextSlug } })
        if (taken && taken.id !== id) {
          return NextResponse.json({ error: 'Товар с таким slug уже существует' }, { status: 400 })
        }
        data.slug = nextSlug
      }
    }

    // Цена и старая цена: скидка сохраняется только если oldPrice > price
    let finalPrice = existing.price
    if (body.price !== undefined) {
      const price = Number(body.price)
      if (!Number.isFinite(price) || price <= 0) {
        return NextResponse.json({ error: 'Цена должна быть числом больше нуля' }, { status: 400 })
      }
      finalPrice = price
      data.price = price
    }
    if (body.oldPrice !== undefined) {
      const oldPrice = Number(body.oldPrice)
      data.oldPrice = Number.isFinite(oldPrice) && oldPrice > finalPrice ? oldPrice : null
    } else if (body.price !== undefined && existing.oldPrice !== null && existing.oldPrice <= finalPrice) {
      // Новая цена перекрыла старую — скидка теряет смысл
      data.oldPrice = null
    }

    // Категория: должна существовать
    if (body.categoryId !== undefined) {
      const categoryId = Number(body.categoryId)
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return NextResponse.json({ error: 'Некорректный идентификатор категории' }, { status: 400 })
      }
      const categoryRow = await db.category.findUnique({ where: { id: categoryId } })
      if (!categoryRow) {
        return NextResponse.json({ error: 'Указанная категория не найдена' }, { status: 400 })
      }
      data.categoryId = categoryId
    }

    if (body.gender !== undefined) {
      data.gender = GENDER_VALUES.includes(body.gender) ? body.gender : 'unisex'
    }
    if (body.label !== undefined) {
      data.label = LABEL_VALUES.includes(body.label) ? body.label : 'none'
    }

    if (body.shortDesc !== undefined) {
      data.shortDesc = typeof body.shortDesc === 'string' ? body.shortDesc.trim() : ''
    }
    if (body.description !== undefined) {
      data.description = typeof body.description === 'string' ? body.description.trim() : ''
    }

    if (body.sizes !== undefined) data.sizes = JSON.stringify(cleanStringArray(body.sizes, 12))
    if (body.colors !== undefined) data.colors = JSON.stringify(cleanStringArray(body.colors))
    if (body.images !== undefined) data.images = JSON.stringify(cleanStringArray(body.images, 8))

    if (body.stock !== undefined) data.stock = normalizeStock(body.stock)
    if (body.rating !== undefined) data.rating = normalizeRating(body.rating)
    if (body.reviews !== undefined) data.reviews = normalizeReviews(body.reviews)
    if (body.featured !== undefined) data.featured = body.featured === true
    if (body.published !== undefined) data.published = body.published === true

    const updated = await db.product.update({
      where: { id },
      data,
      include: { category: true },
    })

    await invalidateCatalogCache()

    return NextResponse.json({ product: DTO.toProductDTO(updated) })
  } catch (error) {
    console.error('[api/admin/products/[id]] ошибка обновления товара:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось обновить товар' }, { status: 500 })
  }
}

// DELETE /api/admin/products/[id] — удаление товара (заказы хранят снимки, ссылок нет)
const DELETE = async (request, context) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const params = await context.params
    const id = parseId(params?.id)
    if (id === null) {
      return NextResponse.json({ error: 'Некорректный идентификатор товара' }, { status: 400 })
    }

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }

    await db.product.delete({ where: { id } })
    await invalidateCatalogCache()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/admin/products/[id]] ошибка удаления товара:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось удалить товар' }, { status: 500 })
  }
}

export { PUT, DELETE }
