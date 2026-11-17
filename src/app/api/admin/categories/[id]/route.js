import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ADMIN from '@/lib/admin'
import CACHE from '@/lib/cache'
import DTO from '@/lib/dto'
import { slugify } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const MAX_NAME_LENGTH = 120
const MAX_SLUG_LENGTH = 64
const MAX_STYLES = 12

const cleanField = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

const parseId = (raw) => {
  const num = parseInt(raw, 10)
  return Number.isNaN(num) ? null : num
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

const invalidateCatalogCache = async () => {
  await CACHE.invalidatePrefix('categories')
  await CACHE.invalidatePrefix('products')
  await CACHE.invalidatePrefix('ssr')
}

// PUT /api/admin/categories/[id] — обновление категории
const PUT = async (request, context) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const params = await context.params
    const id = parseId(params?.id)
    if (id === null) {
      return NextResponse.json({ error: 'Некорректный идентификатор категории' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 })
    }

    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 })
    }

    const data = {}

    if (body.name !== undefined) {
      const name = cleanField(body.name, MAX_NAME_LENGTH)
      if (name.length < 2) {
        return NextResponse.json({ error: 'Название категории должно содержать минимум 2 символа' }, { status: 400 })
      }
      data.name = name
    }

    if (body.slug !== undefined) {
      const slug = slugify(cleanField(body.slug, MAX_SLUG_LENGTH) || existing.slug).slice(0, MAX_SLUG_LENGTH)
      if (slug !== existing.slug) {
        const taken = await db.category.findUnique({ where: { slug } })
        if (taken && taken.id !== id) {
          return NextResponse.json({ error: 'Категория с таким slug уже существует' }, { status: 400 })
        }
        data.slug = slug
      }
    }

    if (body.subtitle !== undefined) data.subtitle = cleanField(body.subtitle, 200)
    if (body.icon !== undefined) data.icon = cleanField(body.icon, 40) || 'Shirt'
    if (body.style !== undefined) data.style = parseStyle(body.style, existing.style)
    if (body.sort !== undefined) data.sort = parseSort(body.sort, existing.sort)

    const updated = await db.category.update({ where: { id }, data })
    await invalidateCatalogCache()

    return NextResponse.json({ category: DTO.toCategoryDTO(updated) })
  } catch (error) {
    console.error('[api/admin/categories/[id]] ошибка обновления категории:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось обновить категорию' }, { status: 500 })
  }
}

// DELETE /api/admin/categories/[id] — удаление категории
// Категорию с товарами удалить нельзя; пустая категория уносит свои подкатегории с собой
const DELETE = async (request, context) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const params = await context.params
    const id = parseId(params?.id)
    if (id === null) {
      return NextResponse.json({ error: 'Некорректный идентификатор категории' }, { status: 400 })
    }

    const existing = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 })
    }

    if (existing._count.products > 0) {
      return NextResponse.json(
        { error: `Сначала перенесите или удалите товары категории (${existing._count.products} шт)` },
        { status: 400 }
      )
    }

    await db.category.delete({ where: { id } })
    await invalidateCatalogCache()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/admin/categories/[id]] ошибка удаления категории:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось удалить категорию' }, { status: 500 })
  }
}

export { PUT, DELETE }
