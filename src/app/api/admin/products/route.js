import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ADMIN from '@/lib/admin'
import CACHE from '@/lib/cache'
import DTO from '@/lib/dto'
import PAGINATION from '@/lib/pagination'
import PAYLOAD from '@/lib/catalogPayload'
import { slugify } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const MAX_SLUG_ATTEMPTS = 5

// GET /api/admin/products — постраничный список товаров (включая неопубликованные и декор)
const GET = async (request) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const { limit, offset } = PAGINATION.parsePagination(searchParams)

    const [rows, total] = await Promise.all([
      db.product.findMany({
        orderBy: { createdAt: 'desc' },
        include: { category: true, subcategory: true },
        take: limit,
        skip: offset,
      }),
      db.product.count(),
    ])

    const items = rows.map((row) => DTO.toProductDTO(row))
    return NextResponse.json({ items, ...PAGINATION.pageMeta(items, total, offset) })
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
    if (!PAYLOAD.isValidName(name)) {
      return NextResponse.json({ error: 'Название товара должно содержать от 2 до 120 символов' }, { status: 400 })
    }

    const price = Number(body.price)
    if (!PAYLOAD.isValidPrice(price)) {
      return NextResponse.json({ error: 'Цена должна быть числом больше нуля' }, { status: 400 })
    }

    const categoryId = await PAYLOAD.resolveCategoryId(db, body.categoryId)
    if (!categoryId) {
      return NextResponse.json({ error: 'Не указана категория товара' }, { status: 400 })
    }

    const subcategory = await PAYLOAD.resolveSubcategoryId(db, body.subcategoryId, categoryId)
    if (subcategory.error) {
      return NextResponse.json({ error: subcategory.error }, { status: 400 })
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

    const oldPrice = PAYLOAD.resolveOldPrice(body.oldPrice, price)
    const gender = PAYLOAD.GENDER_VALUES.includes(body.gender) ? body.gender : 'unisex'
    const label = PAYLOAD.LABEL_VALUES.includes(body.label) ? body.label : 'none'

    const created = await db.product.create({
      data: {
        slug,
        name,
        shortDesc: typeof body.shortDesc === 'string' ? body.shortDesc.trim() : '',
        description: typeof body.description === 'string' ? body.description.trim() : '',
        price,
        oldPrice,
        gender,
        label,
        sizes: JSON.stringify(PAYLOAD.cleanStringArray(body.sizes, 12)),
        colors: JSON.stringify(PAYLOAD.cleanStringArray(body.colors)),
        images: JSON.stringify(PAYLOAD.cleanStringArray(body.images, 8)),
        imageAlts: JSON.stringify(PAYLOAD.cleanAltArray(body.imageAlts, 8)),
        stock: PAYLOAD.normalizeStock(body.stock),
        rating: PAYLOAD.normalizeRating(body.rating),
        reviews: PAYLOAD.normalizeReviews(body.reviews),
        featured: body.featured === true,
        published: body.published === undefined ? true : body.published === true,
        decor: body.decor === true,
        // Собственная ссылка на оплату товара
        paymentUrl: PAYLOAD.resolvePaymentUrl(body.paymentUrl),
        customPayment: body.customPayment === true,
        subcategoryId: subcategory.id,
        categoryId,
      },
      include: { category: true, subcategory: true },
    })

    await CACHE.invalidatePrefix('products')
    await CACHE.invalidatePrefix('categories')
    await CACHE.invalidatePrefix('ssr')

    return NextResponse.json({ product: DTO.toProductDTO(created) }, { status: 201 })
  } catch (error) {
    console.error('[api/admin/products] ошибка создания товара:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось создать товар' }, { status: 500 })
  }
}

export { GET, POST }
