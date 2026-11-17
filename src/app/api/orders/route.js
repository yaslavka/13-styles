import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import CACHE from '@/lib/cache'

export const dynamic = 'force-dynamic'

const MIN_TEXT_LENGTH = 2
const MAX_TEXT_LENGTH = 80
const MIN_PHONE_LENGTH = 5
const MAX_PHONE_LENGTH = 20
const MAX_COMMENT_LENGTH = 500
const MAX_ORDER_ITEMS = 30
const MAX_QTY = 20
const OUT_OF_STOCK_PREFIX = 'Недостаточно товара на складе'

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
      return badRequest('Некорректное тело запроса')
    }

    const customer = typeof body.customer === 'string' ? body.customer.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const address = typeof body.address === 'string' ? body.address.trim() : ''
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, MAX_COMMENT_LENGTH) : ''

    if (customer.length < MIN_TEXT_LENGTH || customer.length > MAX_TEXT_LENGTH) {
      return badRequest(`Укажите имя получателя (от ${MIN_TEXT_LENGTH} до ${MAX_TEXT_LENGTH} символов)`)
    }
    if (phone.length < MIN_PHONE_LENGTH || phone.length > MAX_PHONE_LENGTH) {
      return badRequest(`Укажите телефон (от ${MIN_PHONE_LENGTH} до ${MAX_PHONE_LENGTH} символов)`)
    }
    if (address.length < MIN_TEXT_LENGTH || address.length > MAX_TEXT_LENGTH) {
      return badRequest(`Укажите адрес доставки (от ${MIN_TEXT_LENGTH} до ${MAX_TEXT_LENGTH} символов)`)
    }

    const rawItems = Array.isArray(body.items) ? body.items : []
    if (rawItems.length === 0) {
      return badRequest('Корзина пуста: добавьте хотя бы один товар')
    }
    if (rawItems.length > MAX_ORDER_ITEMS) {
      return badRequest(`В одном заказе не может быть больше ${MAX_ORDER_ITEMS} позиций`)
    }

    const cartItems = []
    for (const raw of rawItems) {
      const productId = Number(raw?.productId)
      if (!Number.isInteger(productId) || productId <= 0) {
        return badRequest('В корзине указан некорректный товар')
      }
      const qty = Number(raw?.qty)
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
        return badRequest(`Количество товара должно быть целым числом от 1 до ${MAX_QTY}`)
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
        return badRequest('Некоторые товары из корзины больше недоступны')
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
      return NextResponse.json({ error: 'Не удалось оформить заказ. Попробуйте позже' }, { status: 500 })
    }

    await CACHE.invalidatePrefix('admin-stats')

    return NextResponse.json(
      { order: { code: createdOrder.code, total: createdOrder.total, status: createdOrder.status } },
      { status: 201 },
    )
  } catch (error) {
    console.error('[api/orders] ошибка оформления заказа:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось оформить заказ. Попробуйте позже' }, { status: 500 })
  }
}

export { POST }
