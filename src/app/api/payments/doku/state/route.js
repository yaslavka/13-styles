import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/payments/doku/state?order=CODE — статус последнего платежа по заказу.
// Используется страницей результата оплаты (/payment/result) для опроса статуса.

const GET = async (request) => {
  const { searchParams } = new URL(request.url)
  const orderCode = String(searchParams.get('order') || '').trim()
  if (!orderCode) {
    return NextResponse.json({ error: 'Order number is missing' }, { status: 400 })
  }

  try {
    const payment = await db.payment.findFirst({
      where: { orderCode },
      orderBy: { createdAt: 'desc' },
    })
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const order = await db.order.findUnique({ where: { code: orderCode } })

    // Снапшот позиций заказа: страница результата оплаты снимает их из корзины,
    // когда оплата успешно подтверждена
    let items = []
    try { items = JSON.parse(order?.items || '[]') } catch {}
    // order.items — строка JSON со списком позиций (снимок корзины)
    items = Array.isArray(items) ? items : []

    return NextResponse.json({
      status: payment.status,
      amountEur: payment.amountEur,
      amountIdr: payment.amountIdr,
      rate: payment.rate,
      merchant: payment.merchantCode,
      channel: payment.channel,
      payUrl: payment.payUrl,
      invoiceNumber: payment.invoiceNumber,
      updatedAt: payment.updatedAt,
      orderStatus: order?.status || null,
      items: items.map((item) => ({ slug: String(item.slug || ''), size: String(item.size || '') })),
    })
  } catch (error) {
    console.error('[doku/state] ошибка:', error?.message || error)
    return NextResponse.json({ error: 'Could not get the payment status' }, { status: 500 })
  }
}

export { GET }
