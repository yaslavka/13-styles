import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ADMIN from '@/lib/admin'
import CACHE from '@/lib/cache'
import DTO from '@/lib/dto'
import { slugify } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const MAX_NAME_LENGTH = 120
const MAX_SLUG_LENGTH = 64

const cleanField = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

const parseId = (raw) => {
  const num = parseInt(raw, 10)
  return Number.isNaN(num) ? null : num
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

// PUT /api/admin/subcategories/[id] — обновление подкатегории
const PUT = async (request, context) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const params = await context.params
    const id = parseId(params?.id)
    if (id === null) {
      return NextResponse.json({ error: 'Некорректный идентификатор подкатегории' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 })
    }

    const existing = await db.subcategory.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Подкатегория не найдена' }, { status: 404 })
    }

    const data = {}

    if (body.name !== undefined) {
      const name = cleanField(body.name, MAX_NAME_LENGTH)
      if (name.length < 2) {
        return NextResponse.json({ error: 'Название подкатегории должно содержать минимум 2 символа' }, { status: 400 })
      }
      data.name = name
    }

    if (body.slug !== undefined) {
      const slug = slugify(cleanField(body.slug, MAX_SLUG_LENGTH) || existing.slug).slice(0, MAX_SLUG_LENGTH)
      if (slug !== existing.slug) {
        const taken = await db.subcategory.findUnique({ where: { slug } })
        if (taken && taken.id !== id) {
          return NextResponse.json({ error: 'Подкатегория с таким slug уже существует' }, { status: 400 })
        }
        data.slug = slug
      }
    }

    // Перенос в другую категорию
    if (body.categoryId !== undefined) {
      const categoryId = Number(body.categoryId)
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return NextResponse.json({ error: 'Некорректный идентификатор категории' }, { status: 400 })
      }
      const category = await db.category.findUnique({ where: { id: categoryId } })
      if (!category) {
        return NextResponse.json({ error: 'Указанная категория не найдена' }, { status: 400 })
      }
      data.categoryId = categoryId
    }

    if (body.sort !== undefined) data.sort = parseSort(body.sort, existing.sort)

    const updated = await db.subcategory.update({ where: { id }, data })
    await invalidateCatalogCache()

    return NextResponse.json({ subcategory: DTO.toSubcategoryDTO(updated) })
  } catch (error) {
    console.error('[api/admin/subcategories/[id]] ошибка обновления подкатегории:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось обновить подкатегорию' }, { status: 500 })
  }
}

// DELETE /api/admin/subcategories/[id] — удаление подкатегории
// Товары не удаляются: у них просто очищается ссылка (SetNull)
const DELETE = async (request, context) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const params = await context.params
    const id = parseId(params?.id)
    if (id === null) {
      return NextResponse.json({ error: 'Некорректный идентификатор подкатегории' }, { status: 400 })
    }

    const existing = await db.subcategory.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Подкатегория не найдена' }, { status: 404 })
    }

    await db.subcategory.delete({ where: { id } })
    await invalidateCatalogCache()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/admin/subcategories/[id]] ошибка удаления подкатегории:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось удалить подкатегорию' }, { status: 500 })
  }
}

export { PUT, DELETE }
