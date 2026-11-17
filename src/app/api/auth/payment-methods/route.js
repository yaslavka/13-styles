import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import DTO from '@/lib/dto'
import USER_AUTH from '@/lib/userAuth'

export const dynamic = 'force-dynamic'

const MAX_LABEL_LENGTH = 60
const MAX_METHODS = 8

// GET /api/auth/payment-methods — список привязанных способов оплаты
const GET = async (request) => {
  try {
    const userId = USER_AUTH.requireUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await db.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ items: rows.map((row) => DTO.toPaymentMethodDTO(row)) })
  } catch (error) {
    console.error('[api/auth/payment-methods] ошибка загрузки способов оплаты:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось загрузить способы оплаты' }, { status: 500 })
  }
}

// POST /api/auth/payment-methods — привязка способа оплаты (только маскированные данные)
const POST = async (request) => {
  try {
    const userId = USER_AUTH.requireUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }
    if (user.blocked || user.banned) {
      return NextResponse.json({ error: 'Аккаунт заблокирован' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 })
    }

    const label = typeof body.label === 'string' ? body.label.trim().slice(0, MAX_LABEL_LENGTH) : ''
    if (label.length < 2) {
      return NextResponse.json({ error: 'Укажите название способа оплаты (минимум 2 символа)' }, { status: 400 })
    }

    const last4 = typeof body.last4 === 'string' ? body.last4.replace(/\D/g, '').slice(0, 4) : ''
    if (last4 && last4.length !== 4) {
      return NextResponse.json({ error: 'Последние 4 цифры карты — ровно 4 цифры' }, { status: 400 })
    }

    const brand = typeof body.brand === 'string' && body.brand.trim() ? body.brand.trim().slice(0, 20) : 'card'
    const expiry = typeof body.expiry === 'string' ? body.expiry.trim().slice(0, 8) : ''

    const count = await db.paymentMethod.count({ where: { userId } })
    if (count >= MAX_METHODS) {
      return NextResponse.json({ error: `Можно привязать не более ${MAX_METHODS} способов оплаты` }, { status: 400 })
    }

    const created = await db.paymentMethod.create({
      data: {
        userId,
        label,
        brand,
        last4,
        expiry,
        // Первая карта становится основной автоматически
        isDefault: count === 0,
      },
    })

    return NextResponse.json({ method: DTO.toPaymentMethodDTO(created) }, { status: 201 })
  } catch (error) {
    console.error('[api/auth/payment-methods] ошибка привязки способа оплаты:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось привязать способ оплаты' }, { status: 500 })
  }
}

export { GET, POST }
