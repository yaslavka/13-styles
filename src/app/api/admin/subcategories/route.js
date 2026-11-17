import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ADMIN from '@/lib/admin'
import CACHE from '@/lib/cache'
import DTO from '@/lib/dto'
import PAGINATION from '@/lib/pagination'
import { slugify } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const MAX_NAME_LENGTH = 120
const MAX_SLUG_LENGTH = 64

const cleanField = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

const parseSort = (raw, fallback = 0) => {
  const num = Number(raw)
  if (!Number.isFinite(num)) return fallback
  return Math.max(0, Math.floor(num))
}

const invalidateCatalogCache = async () => {
  await CACHE.invalidatePrefix('categories')
  await CACHE.invalidatePrefix('products')
  await CACHE.invalidatePrefix('ssr')
}

// GET /api/admin/subcategories — постраничный список подкатегорий со счётчиками
const GET = async (request) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const { limit, offset } = PAGINATION.parsePagination(searchParams)

    const [rows, total] = await Promise.all([
      db.subcategory.findMany({
        orderBy: [{ categoryId: 'asc' }, { sort: 'asc' }, { id: 'asc' }],
        include: {
          category: true,
          _count: { select: { products: true } },
        },
        take: limit,
        skip: offset,
      }),
      db.subcategory.count(),
    ])

    const items = rows.map((row) => ({
      ...DTO.toSubcategoryDTO(row, row._count ? row._count.products : 0),
      category: row.category
        ? { id: row.category.id, slug: row.category.slug, name: row.category.name, style: row.category.style }
        : null,
    }))
    return NextResponse.json({ items, ...PAGINATION.pageMeta(items, total, offset) })
  } catch (error) {
    console.error('[api/admin/subcategories] ошибка загрузки подкатегорий:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось загрузить подкатегории' }, { status: 500 })
  }
}

// POST /api/admin/subcategories — создание подкатегории в существующей категории
const POST = async (request) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 })
    }

    const name = cleanField(body.name, MAX_NAME_LENGTH)
    if (name.length < 2) {
      return NextResponse.json({ error: 'Название подкатегории должно содержать минимум 2 символа' }, { status: 400 })
    }

    const categoryId = Number(body.categoryId)
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: 'Не указана категория подкатегории' }, { status: 400 })
    }
    const category = await db.category.findUnique({ where: { id: categoryId } })
    if (!category) {
      return NextResponse.json({ error: 'Указанная категория не найдена' }, { status: 400 })
    }

    const slug = slugify(cleanField(body.slug, MAX_SLUG_LENGTH) || `${category.slug}-${name}`).slice(0, MAX_SLUG_LENGTH)
    const taken = await db.subcategory.findUnique({ where: { slug } })
    if (taken) {
      return NextResponse.json({ error: 'Подкатегория с таким slug уже существует' }, { status: 400 })
    }

    const created = await db.subcategory.create({
      data: { slug, name, sort: parseSort(body.sort), categoryId },
    })

    await invalidateCatalogCache()
    return NextResponse.json({ subcategory: DTO.toSubcategoryDTO(created) }, { status: 201 })
  } catch (error) {
    console.error('[api/admin/subcategories] ошибка создания подкатегории:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось создать подкатегорию' }, { status: 500 })
  }
}

export { GET, POST }
