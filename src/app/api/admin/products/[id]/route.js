import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ADMIN from '@/lib/admin'
import CACHE from '@/lib/cache'
import DTO from '@/lib/dto'
import PAYLOAD from '@/lib/catalogPayload'
import { slugify } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const parseId = (raw) => {
  const num = parseInt(raw, 10)
  return Number.isNaN(num) ? null : num
}

const invalidateCatalogCache = async () => {
  await CACHE.invalidatePrefix('products')
  await CACHE.invalidatePrefix('categories')
  await CACHE.invalidatePrefix('ssr')
}

// GET /api/admin/products/[id] — один товар для формы редактирования
const GET = async (request, context) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const params = await context.params
    const id = parseId(params?.id)
    if (id === null) {
      return NextResponse.json({ error: 'Некорректный идентификатор товара' }, { status: 400 })
    }

    const row = await db.product.findUnique({
      where: { id },
      include: { category: true, subcategory: true },
    })
    if (!row) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }

    return NextResponse.json({ product: DTO.toProductDTO(row) })
  } catch (error) {
    console.error('[api/admin/products/[id]] ошибка загрузки товара:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось загрузить товар' }, { status: 500 })
  }
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
      if (!PAYLOAD.isValidName(name)) {
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
      if (!PAYLOAD.isValidPrice(price)) {
        return NextResponse.json({ error: 'Цена должна быть числом больше нуля' }, { status: 400 })
      }
      finalPrice = price
      data.price = price
    }
    if (body.oldPrice !== undefined) {
      data.oldPrice = PAYLOAD.resolveOldPrice(body.oldPrice, finalPrice)
    } else if (body.price !== undefined && existing.oldPrice !== null && existing.oldPrice <= finalPrice) {
      // Новая цена перекрыла старую — скидка теряет смысл
      data.oldPrice = null
    }

    // Категория: должна существовать
    let categoryId = existing.categoryId
    if (body.categoryId !== undefined) {
      const nextCategoryId = await PAYLOAD.resolveCategoryId(db, body.categoryId)
      if (!nextCategoryId) {
        return NextResponse.json({ error: 'Указанная категория не найдена' }, { status: 400 })
      }
      categoryId = nextCategoryId
      data.categoryId = categoryId
    }

    // Подкатегория: должна существовать и относиться к категории товара
    if (body.subcategoryId !== undefined) {
      const subcategory = await PAYLOAD.resolveSubcategoryId(db, body.subcategoryId, categoryId)
      if (subcategory.error) {
        return NextResponse.json({ error: subcategory.error }, { status: 400 })
      }
      data.subcategoryId = subcategory.id
    }

    if (body.gender !== undefined) {
      data.gender = PAYLOAD.GENDER_VALUES.includes(body.gender) ? body.gender : 'unisex'
    }
    if (body.label !== undefined) {
      data.label = PAYLOAD.LABEL_VALUES.includes(body.label) ? body.label : 'none'
    }

    if (body.shortDesc !== undefined) {
      data.shortDesc = typeof body.shortDesc === 'string' ? body.shortDesc.trim() : ''
    }
    if (body.description !== undefined) {
      data.description = typeof body.description === 'string' ? body.description.trim() : ''
    }

    if (body.sizes !== undefined) data.sizes = JSON.stringify(PAYLOAD.cleanStringArray(body.sizes, 12))
    if (body.colors !== undefined) data.colors = JSON.stringify(PAYLOAD.cleanStringArray(body.colors))
    if (body.images !== undefined) data.images = JSON.stringify(PAYLOAD.cleanStringArray(body.images, 8))

    if (body.stock !== undefined) data.stock = PAYLOAD.normalizeStock(body.stock)
    if (body.rating !== undefined) data.rating = PAYLOAD.normalizeRating(body.rating)
    if (body.reviews !== undefined) data.reviews = PAYLOAD.normalizeReviews(body.reviews)
    if (body.featured !== undefined) data.featured = body.featured === true
    if (body.published !== undefined) data.published = body.published === true
    if (body.decor !== undefined) data.decor = body.decor === true

    const updated = await db.product.update({
      where: { id },
      data,
      include: { category: true, subcategory: true },
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

export { GET, PUT, DELETE }
