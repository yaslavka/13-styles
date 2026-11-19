import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyNotifySignature, merchantCredentials, getSettings } from '@/lib/doku'

export const dynamic = 'force-dynamic'

// POST /api/payments/doku/notify — HTTP Notification от DOKU (серверный callback).
// Документ: developers.doku.com/get-started-with-doku-api/notification
// URL уведомления передаётся в каждом запросе создания платежа через
// additional_info.override_notification_url — конфигурация в DOKU Console не нужна.
// Проверяем подпись (Request-Target = путь этого URL), обновляем статус платежа,
// при успехе — подтверждаем заказ и сохраняем токен карты (токенизация).

const findTokenDeep = (node, keys, depth = 0, found = []) => {
  if (depth > 6 || found.length > 4) return found
  if (Array.isArray(node)) {
    for (const item of node) findTokenDeep(item, keys, depth + 1, found)
    return found
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (/token/i.test(key) && typeof value === 'string' && value.length > 3 && found.length < 4) {
        found.push(value)
      }
      findTokenDeep(value, keys, depth + 1, found)
    }
  }
  return found
}

const findCardInfoDeep = (node, depth = 0, info = { last4: '', brand: '' }) => {
  if (depth > 6) return info
  if (Array.isArray(node)) {
    for (const item of node) findCardInfoDeep(item, depth + 1, info)
    return info
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string') {
        if (/masked.?pan|card.?number/i.test(key)) {
          const digits = value.replace(/[^0-9]/g, '')
          if (digits.length >= 4) info.last4 = digits.slice(-4)
        }
        if (/card.?brand|card.?type/i.test(key) && value) info.brand = value.slice(0, 24)
      }
      findCardInfoDeep(value, depth + 1, info)
    }
  }
  return info
}

const mapStatus = (raw) => {
  const status = String(raw || '').toUpperCase()
  if (['SUCCESS', 'SUCCESSFUL', 'PAID', 'CAPTURED'].includes(status)) return 'success'
  if (['FAILED', 'FAILURE', 'DENIED', 'DECLINED', 'NOT_APPROVED'].includes(status)) return 'failed'
  if (['EXPIRED'].includes(status)) return 'expired'
  if (['VOID', 'CANCELED', 'CANCELLED', 'TERMINATED'].includes(status)) return 'canceled'
  if (['REFUNDED', 'REFUND'].includes(status)) return 'refunded'
  return 'pending'
}

const POST = async (request) => {
  const rawBody = await request.text()
  const headers = Object.fromEntries(
    Object.entries(request.headers).map(([key, value]) => [key.toLowerCase(), value])
  )
  const clientId = headers['client-id'] || ''

  try {
    let body = {}
    try { body = JSON.parse(rawBody) } catch {}

    const settings = await getSettings()
    const allowUnverified =
      settings.notifyAllowUnverified || process.env.DOKU_NOTIFY_ALLOW_UNVERIFIED === 'true'

    // Мерчант ищем по Client-Id (боевые или песочные ключи)
    const merchants = await db.paymentMerchant.findMany()
    const merchant = merchants.find((m) => m.clientId === clientId || m.sandboxClientId === clientId)

    // Проверка подписи: Request-Target — путь этого эндпоинта
    const targetPath = '/api/payments/doku/notify'
    let verified = false
    if (merchant && !allowUnverified) {
      const mode = merchantCredentials(merchant).mode
      const modes = [mode, mode === 'production' ? 'sandbox' : 'production']
      for (const attemptMode of modes) {
        const creds = merchantCredentials({ ...merchant, mode: attemptMode })
        if (!creds.secretKey) continue
        if (verifyNotifySignature({ headers, rawBody, targetPath, secretKey: creds.secretKey })) {
          verified = true
          break
        }
      }
      if (!verified) {
        console.error('[doku/notify] неверная подпись для', merchant.code)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } else if (!merchant && !allowUnverified) {
      console.error('[doku/notify] неизвестный Client-Id:', clientId)
      return NextResponse.json({ error: 'Unknown client' }, { status: 401 })
    }

    const invoiceNumber = String(body?.order?.invoice_number || '')
    const orderAmount = Number(body?.order?.amount || 0)
    const status = mapStatus(body?.transaction?.status)
    const channel = String(body?.channel?.id || body?.service?.id || '')
    const dokuRequestId = String(body?.transaction?.original_request_id || body?.transaction?.request_id || '')

    if (!invoiceNumber) {
      return NextResponse.json({ error: 'No invoice number' }, { status: 400 })
    }

    // Платёж ищем по инвойсу, резервно — по номеру заказа (префикс инвойса)
    let payment = await db.payment.findFirst({
      where: { invoiceNumber },
      orderBy: { createdAt: 'desc' },
    })
    if (!payment) {
      const orderCode = invoiceNumber.replace(/^INV-/, '').replace(/-R\d+$/, '')
      payment = await db.payment.findFirst({ where: { orderCode }, orderBy: { createdAt: 'desc' } })
    }
    if (!payment) {
      console.error('[doku/notify] платёж не найден:', invoiceNumber)
      // Возвращаем 200, чтобы DOKU не бомбил ретраями неизвестного инвойса
      return NextResponse.json({ ok: true, note: 'payment not found' })
    }

    // Защита от повторной обработки: успешный платёж не понижаем
    if (['success', 'refunded'].includes(payment.status) && status !== 'refunded') {
      return NextResponse.json({ ok: true, note: 'already processed' })
    }

    const tokens = findTokenDeep(body)
    const cardInfo = findCardInfoDeep(body)
    const cardToken = tokens[0] || ''

    await db.payment.update({
      where: { id: payment.id },
      data: {
        status,
        channel,
        dokuRequestId,
        cardToken: cardToken || payment.cardToken,
        cardBrand: cardInfo.brand || payment.cardBrand,
        cardLast4: cardInfo.last4 || payment.cardLast4,
        rawNotify: rawBody.slice(0, 4000),
      },
    })

    if (status === 'success') {
      // Заказ оплачен
      const order = await db.order.findUnique({ where: { code: payment.orderCode } })
      if (order && !['done', 'shipped'].includes(order.status)) {
        await db.order.update({ where: { id: order.id }, data: { status: 'confirmed' } })
      }
      // Сохраняем карту покупателю (токенизация DOKU)
      if (payment.userId && cardToken) {
        const existing = await db.paymentMethod.findFirst({ where: { userId: payment.userId, token: cardToken } })
        if (!existing) {
          await db.paymentMethod.create({
            data: {
              userId: payment.userId,
              label: cardInfo.last4 ? `Карта •••• ${cardInfo.last4}` : 'Сохранённая карта DOKU',
              brand: cardInfo.brand || 'card',
              last4: cardInfo.last4 || '',
              token: cardToken,
            },
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[doku/notify] ошибка:', error?.message || error)
    return NextResponse.json({ error: 'Notify processing error' }, { status: 500 })
  }
}

export { POST }
