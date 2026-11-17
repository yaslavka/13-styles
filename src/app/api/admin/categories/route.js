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
const MAX_STYLES = 12

const cleanField = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

const invalidateCatalogCache = async () => {
  await CACHE.invalidatePrefix('categories')
  await CACHE.invalidatePrefix('products')
  await CACHE.invalidatePrefix('ssr')
}

const parseStyle = (raw, fallback = 0) => {
  const num = Number(raw)
  if (!Number.isFinite(num)) return fallback
  return Math.min(MAX_STYLES, Math.max(0, Math.floor(num)))
}

const parseSort = (raw, fallback = 0) => {
  const num = Number(raw)
  if (!Number.isFinite(num)) return fallback
  return Math.max(0, Math.floor(num))
}

// GET /api/admin/categories — постраничный список категорий со счётчиками
const GET = async (request) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const { limit, offset } = PAGINATION.parsePagination(searchParams)

    const [rows, total] = await Promise.all([
      db.category.findMany({
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
        include: {
          _count: { select: { products: true, subcategories: true } },
        },
        take: limit,
        skip: offset,
      }),
      db.category.count(),
    ])

    const items = rows.map((row) => ({
      ...DTO.toCategoryDTO(row, row._count ? row._count.products : 0),
      subcategoryCount: row._count ? row._count.subcategories : 0,
    }))
    return NextResponse.json({ items, ...PAGINATION.pageMeta(items, total, offset) })
  } catch (error) {
    console.error('[api/admin/categories] ошибка загрузки категорий:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось загрузить категории' }, { status: 500 })
  }
}

// POST /api/admin/categories — создание категории
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
      return NextResponse.json({ error: 'Название категории должно содержать минимум 2 символа' }, { status: 400 })
    }

    const slug = slugify(cleanField(body.slug, MAX_SLUG_LENGTH) || name).slice(0, MAX_SLUG_LENGTH)
    const taken = await db.category.findUnique({ where: { slug } })
    if (taken) {
      return NextResponse.json({ error: 'Категория с таким slug уже существует' }, { status: 400 })
    }

    const created = await db.category.create({
      data: {
        slug,
        name,
        subtitle: cleanField(body.subtitle, 200),
        icon: cleanField(body.icon, 40) || 'Shirt',
        style: parseStyle(body.style),
        sort: parseSort(body.sort),
      },
    })

    await invalidateCatalogCache()
    return NextResponse.json({ category: DTO.toCategoryDTO(created) }, { status: 201 })
  } catch (error) {
    console.error('[api/admin/categories] ошибка создания категории:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось создать категорию' }, { status: 500 })
  }
}

export { GET, POST }
