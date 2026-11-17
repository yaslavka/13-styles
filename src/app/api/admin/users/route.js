import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ADMIN from '@/lib/admin'
import DTO from '@/lib/dto'
import PAGINATION from '@/lib/pagination'

export const dynamic = 'force-dynamic'

// GET /api/admin/users — постраничный список пользователей с количеством заказов
const GET = async (request) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const { limit, offset } = PAGINATION.parsePagination(searchParams)

    const [rows, total] = await Promise.all([
      db.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { orders: true } } },
        take: limit,
        skip: offset,
      }),
      db.user.count(),
    ])

    const items = rows.map((row) => DTO.toAdminUserDTO(row))
    return NextResponse.json({ items, ...PAGINATION.pageMeta(items, total, offset) })
  } catch (error) {
    console.error('[api/admin/users] ошибка загрузки пользователей:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось загрузить список пользователей' }, { status: 500 })
  }
}

export { GET }
