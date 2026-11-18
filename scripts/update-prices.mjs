// Пересмотр цен 13 STYLES:
//  1) Товары Garments2Look (g2l-*) — люксовые диапазоны Mytheresa/Polyvore,
//     детерминированно из хэша слага (как при импорте, но с новыми диапазонами).
//  2) Базовый каталог (Livostyle) — подъём уровня цен: ×1.9 с полом 39 €,
//     oldPrice масштабируется вместе с price.
//  3) decor-товары не трогаем.
// Запуск: node scripts/update-prices.mjs

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Люксовые диапазоны (EUR)
const PRICE_RANGES = {
  clothing: [120, 650],
  shoes: [180, 950],
  bags: [290, 2400],
  accessories: [70, 480],
  jewelry: [150, 1400],
  kids: [60, 260],
}

const hashOf = (str) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const priceFor = (rangeKey, h, slug) => {
  const [min, max] = PRICE_RANGES[rangeKey] || PRICE_RANGES.clothing
  let price = Math.round((min + (h % (max - min + 1))) / 10) * 10 + 9
  // топ-6% товаров — «лимитированные» позиции заметно дороже
  if (h % 100 < 6) price = Math.round((price * 1.6) / 10) * 10 + 9
  return Math.min(Math.max(price, min), Math.round(max * 1.6))
}

// диапазон по подкатегории g2l-товара (точнее, чем просто категория)
const rangeKeyFor = (categorySlug, subcategoryName) => {
  const n = (subcategoryName || '').toLowerCase()
  const has = (...words) => words.some((w) => n.includes(w))
  if (categorySlug === 'kids') return 'kids'
  if (categorySlug === 'shoes') return 'shoes'
  if (categorySlug === 'accessories') {
    if (has('bag', 'backpack', 'wallet', 'clutch', 'tote', 'shoulder', 'top-handle')) return 'bags'
    if (has('earring', 'necklace', 'ring', 'bracelet', 'brooch', 'jewelry', 'pendant', 'chain', 'watch')) return 'jewelry'
    return 'accessories'
  }
  return 'clothing'
}

const main = async () => {
  const products = await db.product.findMany({
    where: { decor: false },
    select: { id: true, slug: true, price: true, oldPrice: true, category: { select: { slug: true } }, subcategory: { select: { name: true } } },
  })
  console.log(`[prices] товаров к пересмотру: ${products.length}`)

  let g2l = 0
  let base = 0
  let minPrice = Infinity
  let maxPrice = 0

  for (const p of products) {
    let price
    let oldPrice = null
    if (p.slug.startsWith('g2l-')) {
      const h = hashOf(p.slug)
      price = priceFor(rangeKeyFor(p.category?.slug, p.subcategory?.name), h, p.slug)
      if (h % 4 === 0) oldPrice = Math.round((price * (120 + (h % 26))) / 100)
      g2l++
    } else {
      price = Math.max(39, Math.round((p.price * 1.9) / 10) * 10 + 9)
      if (p.oldPrice) oldPrice = Math.max(59, Math.round((p.oldPrice * 1.9) / 10) * 10 + 9)
      base++
    }
    minPrice = Math.min(minPrice, price)
    maxPrice = Math.max(maxPrice, price)
    await db.product.update({ where: { id: p.id }, data: { price, oldPrice } })
  }

  console.log(`[prices] g2l обновлено: ${g2l}, базовый каталог: ${base}`)
  console.log(`[prices] минимум на витрине: ${minPrice} €, максимум: ${maxPrice} €`)
  const over150 = await db.product.count({ where: { price: { gt: 150 }, decor: false } })
  console.log(`[prices] товаров дороже 150 €: ${over150}`)
}

main()
  .catch((e) => { console.error('[prices] ошибка:', e); process.exit(1) })
  .finally(async () => { try { await db.$disconnect() } catch {} })
