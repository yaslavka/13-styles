import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ADMIN from '@/lib/admin'
import DTO from '@/lib/dto'

export const dynamic = 'force-dynamic'

const ORDER_STATUSES = ['new', 'confirmed', 'shipped', 'done', 'canceled']

// PUT /api/admin/orders/[id] — смена статуса заказа
const PUT = async (request, context) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const params = await context.params
    const id = parseInt(params?.id, 10)
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'Некорректный идентификатор заказа' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 })
    }
    if (!ORDER_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Некорректный статус заказа' }, { status: 400 })
    }

    const existing = await db.order.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
    }

    const updated = await db.order.update({
      where: { id },
      data: { status: body.status },
    })

    return NextResponse.json({ order: DTO.toOrderDTO(updated) })
  } catch (error) {
    console.error('[api/admin/orders/[id]] ошибка обновления заказа:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось обновить заказ' }, { status: 500 })
  }
}

export { PUT }
