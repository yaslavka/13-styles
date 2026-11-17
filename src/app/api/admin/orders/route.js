import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ADMIN from '@/lib/admin'
import DTO from '@/lib/dto'

export const dynamic = 'force-dynamic'

const MAX_FETCH_ROWS = 200

// GET /api/admin/orders — последние заказы для панели управления
const GET = async (request) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rows = await db.order.findMany({
      take: MAX_FETCH_ROWS,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ items: rows.map((row) => DTO.toOrderDTO(row)) })
  } catch (error) {
    console.error('[api/admin/orders] ошибка загрузки заказов:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось загрузить заказы' }, { status: 500 })
  }
}

export { GET }
