import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import CACHE from '@/lib/cache'
import DTO from '@/lib/dto'

export const dynamic = 'force-dynamic'

// GET /api/categories — список категорий с числом опубликованных товаров
const GET = async () => {
  try {
    const categories = await CACHE.wrap('categories:v1', 60000, async () => {
      const rows = await db.category.findMany({
        orderBy: { sort: 'asc' },
        include: {
          _count: {
            select: {
              products: { where: { published: true } },
            },
          },
        },
      })
      return rows.map((row) => DTO.toCategoryDTO(row, row._count ? row._count.products : 0))
    })
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('[api/categories] ошибка загрузки категорий:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось загрузить категории' }, { status: 500 })
  }
}

export { GET }
