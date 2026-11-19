import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createCheckoutPayment, getDefaultMerchant, getEurIdrRate, getSettings, eurToIdr, merchantCredentials } from '@/lib/doku'
import { SITE_URL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

// POST /api/payments/doku/create — создать платёж DOKU Checkout для заказа.
// Тело: { orderCode, merchantCode? }
// Сумма приходит в EUR (каталог) и конвертируется в IDR на нашей стороне.

const POST = async (request) => {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 })
  }

  const orderCode = String(body?.orderCode || '').trim()
  if (!orderCode) {
    return NextResponse.json({ error: 'Не указан номер заказа' }, { status: 400 })
  }

  try {
    const order = await db.order.findUnique({ where: { code: orderCode } })
    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
    }
    if (['canceled'].includes(order.status)) {
      return NextResponse.json({ error: 'Заказ отменён — оплата невозможна' }, { status: 400 })
    }

    let merchant = null
    const requestedCode = String(body?.merchantCode || '').trim()
    if (requestedCode) {
      merchant = await db.paymentMerchant.findUnique({ where: { code: requestedCode } })
      if (!merchant || !merchant.enabled) {
        return NextResponse.json({ error: `Мерчант ${requestedCode} недоступен` }, { status: 400 })
      }
    }
    if (!merchant) merchant = await getDefaultMerchant()
    if (!merchant) {
      return NextResponse.json({ error: 'Платёжная система не настроена' }, { status: 500 })
    }

    const settings = await getSettings()
    const { rate, source: rateSource } = await getEurIdrRate(settings.eurIdrFallback)
    const amountIdr = eurToIdr(order.total, rate)

    // Инвойс уникален для каждой попытки оплаты
    const attempts = await db.payment.count({ where: { orderCode: order.code } })
    const invoiceNumber = attempts === 0 ? `INV-${order.code}` : `INV-${order.code}-R${attempts}`

    // Токенизация карт: customer.id связывает карту покупателя в DOKU
    const customerRef = order.userId ? `user-${order.userId}` : `guest-${order.code.toLowerCase()}`

    // Позиции заказа: конвертируем каждую, последняя корректирует округление
    let lineItemsRaw = []
    try { lineItemsRaw = JSON.parse(order.items || '[]') } catch {}
    const lineItems = lineItemsRaw.map((item, index) => ({
      id: String(item.productId ?? index),
      name: String(item.name || `Item ${index + 1}`).slice(0, 48),
      quantity: Number(item.qty || 1),
      price: eurToIdr(Number(item.price || 0), rate),
      category: 'merchandise',
    }))
    const linesSum = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    if (lineItems.length && linesSum !== amountIdr && lineItems[lineItems.length - 1]) {
      const last = lineItems[lineItems.length - 1]
      last.price = Math.max(1, last.price + (amountIdr - linesSum))
    }

    const requestBody = {
      order: {
        amount: amountIdr,
        invoice_number: invoiceNumber,
        currency: 'IDR',
        callback_url: `${SITE_URL}/payment/result?order=${order.code}`,
        callback_url_result: `${SITE_URL}/payment/result?order=${order.code}`,
        language: 'EN',
        line_items: lineItems,
      },
      payment: {
        payment_due_date: Math.max(10, settings.paymentDueMinutes || 60),
        type: 'SALE',
      },
      customer: {
        ...(settings.customerTokenization ? { id: customerRef } : {}),
        name: order.customer || '13 STYLES customer',
        phone: String(order.phone || '').replace(/[^0-9+]/g, '').slice(0, 18) || undefined,
      },
    }

    const result = await createCheckoutPayment({ merchant, body: requestBody })
    const payUrl = result.json?.response?.payment?.url || ''
    const sessionId = result.json?.response?.order?.session_id || ''

    if (!result.ok || !payUrl) {
      await db.payment.create({
        data: {
          orderCode: order.code,
          merchantCode: merchant.code,
          amountEur: order.total,
          amountIdr,
          rate,
          status: 'failed',
          requestId: result.requestId,
          invoiceNumber,
          customerRef,
          mode: merchantCredentials(merchant).mode,
          rawRequest: JSON.stringify(result.json).slice(0, 4000),
        },
      })
      console.error('[doku/create] ошибка DOKU:', result.status, JSON.stringify(result.json).slice(0, 500))
      return NextResponse.json({ error: 'DOKU отклонил создание платежа', detail: result.json }, { status: 502 })
    }

    const payment = await db.payment.create({
      data: {
        orderCode: order.code,
        merchantCode: merchant.code,
        amountEur: order.total,
        amountIdr,
        rate,
        status: 'pending',
        requestId: result.requestId,
        invoiceNumber,
        payUrl,
        sessionId,
        customerRef,
        mode: merchantCredentials(merchant).mode,
        rawRequest: JSON.stringify(requestBody).slice(0, 4000),
        userId: order.userId ?? null,
      },
    })

    return NextResponse.json({
      paymentId: payment.id,
      paymentUrl: payUrl,
      invoiceNumber,
      amountEur: order.total,
      amountIdr,
      rate,
      rateSource,
      merchant: { code: merchant.code, name: merchant.name },
      mode: merchantCredentials(merchant).mode,
    })
  } catch (error) {
    console.error('[doku/create] ошибка:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось создать платёж' }, { status: 500 })
  }
}

export { POST }
