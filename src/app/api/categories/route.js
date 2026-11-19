import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import CACHE from '@/lib/cache'
import DTO from '@/lib/dto'

export const dynamic = 'force-dynamic'

// GET /api/categories — список категорий с числом опубликованных товаров и подкатегориями
const GET = async () => {
  try {
    const categories = await CACHE.wrap('categories:v2', 60000, async () => {
      const rows = await db.category.findMany({
        orderBy: { sort: 'asc' },
        include: {
          _count: {
            select: {
              products: { where: { published: true, decor: false } },
            },
          },
          subcategories: { orderBy: { sort: 'asc' } },
        },
      })
      return rows.map((row) => DTO.toCategoryDTO(row, row._count ? row._count.products : 0))
    })
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('[api/categories] ошибка загрузки категорий:', error?.message || error)
    return NextResponse.json({ error: 'Could not load categories' }, { status: 500 })
  }
}

export { GET }
