import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import DTO from '@/lib/dto'
import USER_AUTH from '@/lib/userAuth'
import PAGINATION from '@/lib/pagination'

export const dynamic = 'force-dynamic'

// GET /api/auth/orders — история заказов авторизованного покупателя
const GET = async (request) => {
  try {
    const userId = USER_AUTH.requireUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const { limit, offset } = PAGINATION.parsePagination(searchParams)

    const [rows, total] = await Promise.all([
      db.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.order.count({ where: { userId } }),
    ])

    const items = rows.map((row) => DTO.toOrderDTO(row))
    return NextResponse.json({ items, ...PAGINATION.pageMeta(items, total, offset) })
  } catch (error) {
    console.error('[api/auth/orders] ошибка загрузки истории заказов:', error?.message || error)
    return NextResponse.json({ error: 'Could not load the order history' }, { status: 500 })
  }
}

export { GET }
