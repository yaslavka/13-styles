import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import DTO from '@/lib/dto'
import USER_AUTH from '@/lib/userAuth'

export const dynamic = 'force-dynamic'

const parseId = (raw) => {
  const num = parseInt(raw, 10)
  return Number.isNaN(num) ? null : num
}

// PUT /api/auth/payment-methods/[id] — сделать способ оплаты основным
const PUT = async (request, context) => {
  try {
    const userId = USER_AUTH.requireUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const id = parseId(params?.id)
    if (id === null) {
      return NextResponse.json({ error: 'Некорректный идентификатор' }, { status: 400 })
    }

    const existing = await db.paymentMethod.findFirst({ where: { id, userId } })
    if (!existing) {
      return NextResponse.json({ error: 'Способ оплаты не найден' }, { status: 404 })
    }

    const updated = await db.$transaction(async (tx) => {
      await tx.paymentMethod.updateMany({ where: { userId }, data: { isDefault: false } })
      return tx.paymentMethod.update({ where: { id }, data: { isDefault: true } })
    })

    return NextResponse.json({ method: DTO.toPaymentMethodDTO(updated) })
  } catch (error) {
    console.error('[api/auth/payment-methods/[id]] ошибка обновления:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось обновить способ оплаты' }, { status: 500 })
  }
}

// DELETE /api/auth/payment-methods/[id] — отвязка способа оплаты
const DELETE = async (request, context) => {
  try {
    const userId = USER_AUTH.requireUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const id = parseId(params?.id)
    if (id === null) {
      return NextResponse.json({ error: 'Некорректный идентификатор' }, { status: 400 })
    }

    const existing = await db.paymentMethod.findFirst({ where: { id, userId } })
    if (!existing) {
      return NextResponse.json({ error: 'Способ оплаты не найден' }, { status: 404 })
    }

    await db.paymentMethod.delete({ where: { id } })

    // Если удалили основную — назначаем основной самый свежий из оставшихся
    if (existing.isDefault) {
      const next = await db.paymentMethod.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })
      if (next) {
        await db.paymentMethod.update({ where: { id: next.id }, data: { isDefault: true } })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/auth/payment-methods/[id]] ошибка отвязки:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось отвязать способ оплаты' }, { status: 500 })
  }
}

export { PUT, DELETE }
