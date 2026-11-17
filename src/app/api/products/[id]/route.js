import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import DTO from '@/lib/dto'

export const dynamic = 'force-dynamic'

const MAX_PARAM_LENGTH = 100
const MAX_INT_ID = 2147483647

// GET /api/products/[id] — один опубликованный товар по числовому id или slug
const GET = async (request, context) => {
  try {
    const params = await context.params
    const id = typeof params?.id === 'string' ? params.id.trim() : ''

    if (id.length === 0) {
      return NextResponse.json({ error: 'Не указан идентификатор товара' }, { status: 400 })
    }
    if (id.length > MAX_PARAM_LENGTH) {
      return NextResponse.json({ error: 'Идентификатор товара слишком длинный' }, { status: 400 })
    }

    const isNumeric = /^\d+$/.test(id)
    const numericId = isNumeric ? Number(id) : null

    // Слишком большие числа не могут быть id (Int в SQLite) — сразу «не найдено»
    if (numericId !== null && (!Number.isSafeInteger(numericId) || numericId > MAX_INT_ID)) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }

    const row = await db.product.findFirst({
      where: isNumeric ? { id: numericId, published: true } : { slug: id, published: true },
      include: { category: true },
    })

    if (!row) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }

    return NextResponse.json({ product: DTO.toProductDTO(row) })
  } catch (error) {
    console.error('[api/products/[id]] ошибка загрузки товара:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось загрузить товар' }, { status: 500 })
  }
}

export { GET }
