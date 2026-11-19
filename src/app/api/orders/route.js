import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import CACHE from '@/lib/cache'
import USER_AUTH from '@/lib/userAuth'

export const dynamic = 'force-dynamic'

const MIN_TEXT_LENGTH = 2
const MAX_TEXT_LENGTH = 80
const MIN_PHONE_LENGTH = 5
const MAX_PHONE_LENGTH = 20
const MAX_COMMENT_LENGTH = 500
const MAX_ORDER_ITEMS = 30
const MAX_QTY = 20
const OUT_OF_STOCK_PREFIX = 'Not enough stock for'
const PAYMENT_MODES = ['system', 'link']

const badRequest = (message) => NextResponse.json({ error: message }, { status: 400 })

// Первое изображение из JSON-строки товара (снимок для истории заказа)
const firstImage = (raw) => {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? String(parsed[0]) : ''
  } catch {
    return ''
  }
}

const roundMoney = (value) => Math.round(value * 100) / 100

// POST /api/orders — оформление заказа с проверкой остатков в транзакции
const POST = async (request) => {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return badRequest('Invalid request body')
    }

    const customer = typeof body.customer === 'string' ? body.customer.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const address = typeof body.address === 'string' ? body.address.trim() : ''
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, MAX_COMMENT_LENGTH) : ''

    if (customer.length < MIN_TEXT_LENGTH || customer.length > MAX_TEXT_LENGTH) {
      return badRequest(`Recipient name must be ${MIN_TEXT_LENGTH}–${MAX_TEXT_LENGTH} characters`)
    }
    if (phone.length < MIN_PHONE_LENGTH || phone.length > MAX_PHONE_LENGTH) {
      return badRequest(`Phone number must be ${MIN_PHONE_LENGTH}–${MAX_PHONE_LENGTH} characters`)
    }
    if (address.length < MIN_TEXT_LENGTH || address.length > MAX_TEXT_LENGTH) {
      return badRequest(`Delivery address must be ${MIN_TEXT_LENGTH}–${MAX_TEXT_LENGTH} characters`)
    }

    const rawItems = Array.isArray(body.items) ? body.items : []
    if (rawItems.length === 0) {
      return badRequest('Cart is empty: add at least one item')
    }
    if (rawItems.length > MAX_ORDER_ITEMS) {
      return badRequest(`An order cannot contain more than ${MAX_ORDER_ITEMS} items`)
    }

    // Режим оплаты: system — общая платёжная система, link — оплата по собственной
    // ссылке товара (кнопка «Оплатить» у каждой позиции корзины)
    const paymentMode = PAYMENT_MODES.includes(body.paymentMode) ? body.paymentMode : 'system'

    // Авторизованный покупатель: заказ попадает в его личный кабинет (история заказов)
    const authorizedUserId = USER_AUTH.requireUser(request)
    const user = authorizedUserId
      ? await db.user.findUnique({ where: { id: authorizedUserId } })
      : null
    const userId = user && !user.blocked && !user.banned ? user.id : null

    const cartItems = []
    for (const raw of rawItems) {
      const productId = Number(raw?.productId)
      if (!Number.isInteger(productId) || productId <= 0) {
        return badRequest('Your cart contains an unavailable product')
      }
      const qty = Number(raw?.qty)
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
        return badRequest(`Quantity must be a whole number from 1 to ${MAX_QTY}`)
      }
      const size = raw?.size === undefined || raw?.size === null ? '' : String(raw.size)
      cartItems.push({ productId, qty, size: size.slice(0, 50) })
    }

    // Загружаем только опубликованные товары по id из корзины
    const productRows = await db.product.findMany({
      where: { id: { in: cartItems.map((item) => item.productId) }, published: true },
    })
    const productsById = new Map(productRows.map((row) => [row.id, row]))

    for (const item of cartItems) {
      if (!productsById.has(item.productId)) {
        return badRequest('Some items in your cart are no longer available')
      }
    }

    // Снимок позиций на момент заказа (цены и названия не зависят от будущих правок каталога)
    const snapshotItems = cartItems.map((item) => {
      const row = productsById.get(item.productId)
      return {
        productId: row.id,
        slug: row.slug,
        name: row.name,
        price: row.price,
        qty: item.qty,
        size: item.size,
        image: firstImage(row.images),
        paidByLink: row.customPayment === true,
      }
    })

    const total = roundMoney(snapshotItems.reduce((sum, item) => sum + item.price * item.qty, 0))
    const code = `PX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    let createdOrder = null
    try {
      createdOrder = await db.$transaction(async (tx) => {
        // Списываем со склада только если остатка хватает (атомарно по каждому товару)
        for (const item of snapshotItems) {
          const updated = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.qty } },
            data: { stock: { decrement: item.qty } },
          })
          if (updated.count !== 1) {
            throw new Error(`${OUT_OF_STOCK_PREFIX}: ${item.name}`)
          }
        }

        return tx.order.create({
          data: {
            code,
            userId,
            paymentMode,
            customer,
            phone,
            address,
            comment,
            total,
            status: 'new',
            items: JSON.stringify(snapshotItems),
          },
        })
      })
    } catch (txError) {
      const message = typeof txError?.message === 'string' ? txError.message : ''
      if (message.startsWith(OUT_OF_STOCK_PREFIX)) {
        return badRequest(message)
      }
      console.error('[api/orders] ошибка транзакции заказа:', txError?.message || txError)
      return NextResponse.json({ error: 'Could not place the order. Please try again later' }, { status: 500 })
    }

    await CACHE.invalidatePrefix('admin-stats')

    return NextResponse.json(
      { order: { code: createdOrder.code, total: createdOrder.total, status: createdOrder.status } },
      { status: 201 },
    )
  } catch (error) {
    console.error('[api/orders] ошибка оформления заказа:', error?.message || error)
    return NextResponse.json({ error: 'Could not place the order. Please try again later' }, { status: 500 })
  }
}

export { POST }
