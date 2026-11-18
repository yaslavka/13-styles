// Импорт каталога Garments2Look (Mytheresa + Polyvore) в БД 13 STYLES.
// Источник: data/garments2look/*.json.gz (полные метаданные датасета, gzip).
// Все товары создаются published=false — витрина показывает их автоматически,
// как только на диске появляются фото (scripts/sync-garments2look.mjs).
// Идемпотентно: повторный запуск только досоздаёт отсутствующие строки.
// Запуск: node scripts/import-garments2look.mjs

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const db = new PrismaClient()

const DATA_DIR = path.join(ROOT, 'data', 'garments2look')
const MY_FILE = path.join(DATA_DIR, 'mytheresa_image_v1.0_2512.json.gz')
const PV_FILE = path.join(DATA_DIR, 'polyvore_image_v1.0_2512.json.gz')

const readGzJson = (file) => JSON.parse(zlib.gunzipSync(fs.readFileSync(file)))

// ---------- утилиты ----------

// Детерминированный «случай» из строки: одинаковый результат на любой машине
const hashOf = (str) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0)
}

const titleCase = (s) =>
  s.replace(/['’`]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')

const cleanText = (s, cap) => {
  if (!s) return ''
  let t = String(s).replace(/\s+/g, ' ').trim()
  if (t.length <= cap) return t
  const cut = t.lastIndexOf(' ', cap)
  t = t.slice(0, cut > 80 ? cut : cap)
  return t.replace(/[,;:.\s]+$/, '') + '…'
}

// Люксовые диапазоны (EUR) — синхронизированы со scripts/update-prices.mjs
const PRICE_RANGES = {
  clothing: [120, 650],
  shoes: [180, 950],
  bags: [290, 2400],
  accessories: [70, 480],
  jewelry: [150, 1400],
  kids: [60, 260],
}

const priceFor = (rangeKey, h) => {
  const [min, max] = PRICE_RANGES[rangeKey] || PRICE_RANGES.clothing
  let price = Math.round(((min + (h % (max - min + 1))) / 10)) * 10 + 9
  // топ-6% товаров — «лимитированные» позиции заметно дороже
  if (h % 100 < 6) price = Math.round((price * 1.6) / 10) * 10 + 9
  return Math.min(Math.max(price, min), Math.round(max * 1.6))
}

const SIZES = {
  clothing: JSON.stringify(['XS', 'S', 'M', 'L', 'XL']),
  shoes: JSON.stringify(['36', '37', '38', '39', '40', '41']),
  os: JSON.stringify(['OS']),
}

const POLYVORE_LABELS = {
  bag: 'Bags', shoes: 'Shoes', top: 'Tops', outwear: 'Outerwear',
  pants: 'Pants', dress: 'Dresses', eyewear: 'Eyewear', earrings: 'Earrings',
  skirt: 'Skirts', bracelet: 'Bracelets', necklace: 'Necklaces', rings: 'Rings',
  hats: 'Hats', watches: 'Watches', neckwear: 'Neckwear', brooch: 'Brooches',
  hairwear: 'Hair Accessories', gloves: 'Gloves', jumpsuit: 'Jumpsuits',
  legwear: 'Legwear', bottom: 'Bottoms',
}

// ---------- маппинг категории/подкатегории ----------

const subSlugFor = (categorySlug, name) =>
  `${categorySlug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`

// Mytheresa: type = "clothing::dresses::maxi dresses" | "bags::shoulder bags" | "baby bibs"
// Возвращаем { categorySlug, subLabel, priceKey, sizeKey }
const mapMytheresa = (item) => {
  const parts = item.type.split('::').map((s) => s.trim()).filter(Boolean)
  const top = parts[0] || 'clothing'
  const gender = item.gender
  const isKidsGender = ['baby', 'boys', 'girls'].includes(gender) || top.startsWith('baby')

  let categorySlug
  let priceKey
  let sizeKey
  let subLabel

  if (isKidsGender || top.startsWith('baby')) {
    categorySlug = 'kids'
    priceKey = 'kids'
    sizeKey = 'clothing'
    subLabel = titleCase(top.startsWith('baby') ? top : `${top} clothing`)
  } else if (top === 'shoes') {
    categorySlug = 'shoes'
    priceKey = 'shoes'
    sizeKey = 'shoes'
    subLabel = titleCase(parts[1] || 'shoes')
  } else if (top === 'bags' || top === 'accessories' || top === 'jewelry') {
    categorySlug = 'accessories'
    priceKey = top === 'jewelry' ? 'jewelry' : top === 'bags' ? 'bags' : 'accessories'
    sizeKey = 'os'
    subLabel = titleCase(parts[1] || (top === 'bags' ? 'bags' : top === 'jewelry' ? 'jewelry' : 'accessories'))
  } else {
    // clothing (и всё прочее) — по полу
    categorySlug = gender === 'men' ? 'men' : 'women'
    priceKey = 'clothing'
    sizeKey = 'clothing'
    subLabel = titleCase(parts[1] || 'clothing')
  }
  return { categorySlug, subLabel, priceKey, sizeKey }
}

// Polyvore: type = "bag" | "top" | ... , все товары — women
const mapPolyvore = (item) => {
  const type = (item.type || 'clothing').trim()
  let categorySlug = 'women'
  let priceKey = 'clothing'
  let sizeKey = 'clothing'
  let subLabel = POLYVORE_LABELS[type] || titleCase(type)

  if (type === 'shoes') { categorySlug = 'shoes'; priceKey = 'shoes'; sizeKey = 'shoes' }
  else if (['bag', 'eyewear', 'earrings', 'bracelet', 'necklace', 'rings', 'hats', 'watches', 'neckwear', 'brooch', 'hairwear', 'gloves', 'legwear'].includes(type)) {
    categorySlug = 'accessories'
    sizeKey = 'os'
    priceKey = type === 'bag' ? 'bags' : (['earrings', 'necklace', 'bracelet', 'rings', 'brooch'].includes(type) ? 'jewelry' : 'accessories')
  }
  return { categorySlug, subLabel, priceKey, sizeKey }
}

// ---------- основной поток ----------

const buildRow = (slug, item, mapping, subIdBySlug, catBySlug, now) => {
  const h = hashOf(slug)
  const price = priceFor(mapping.priceKey, h)
  const hasOld = h % 4 === 0
  const oldPrice = hasOld ? Math.round(price * (125 + (h % 20)) / 100) : null

  const descBody = (item.official_description && item.official_description.trim())
    || item.description
    || item.name
  const features = Array.isArray(item.features) ? item.features.filter(Boolean).slice(0, 6) : []
  let description = cleanText(descBody, 1200)
  if (features.length) {
    description += '\n\nDetails:\n' + features.map((f) => `• ${cleanText(f, 160)}`).join('\n')
  }

  const label = h % 17 === 0 ? 'new' : h % 23 === 0 ? 'hit' : 'none'
  const color = (item.color || '').trim()
  const colors = JSON.stringify(color ? [titleCase(color)] : [])

  const categoryId = catBySlug.get(mapping.categorySlug)
  const subcategoryId = subIdBySlug.get(`${mapping.categorySlug}|${mapping.subLabel}`) || null

  return [
    slug,
    cleanText(item.name || 'Untitled item', 160),
    cleanText(descBody, 150),
    description,
    price,
    oldPrice,
    ['men', 'women'].includes(item.gender) ? item.gender : 'unisex',
    SIZES[mapping.sizeKey],
    colors,
    '[]', // images — заполнит sync-garments2look когда появятся фото
    label,
    3 + (h % 20),
    4.3 + (h % 7) * 0.1,
    8 + (h % 90),
    h % 29 === 0 ? 1 : 0,
    0, // published=false — до появления фото
    0, // decor=false
    '', // paymentUrl
    0, // customPayment
    categoryId,
    subcategoryId,
    now,
    now,
  ]
}

const COLUMNS = `slug,name,shortDesc,description,price,oldPrice,gender,sizes,colors,images,label,stock,rating,reviews,featured,published,decor,paymentUrl,customPayment,categoryId,subcategoryId,createdAt,updatedAt`
const PLACEHOLDER = '(' + COLUMNS.split(',').map(() => '?').join(',') + ')'

const insertChunk = async (rows) => {
  const sql = `INSERT OR IGNORE INTO Product (${COLUMNS}) VALUES ` + rows.map(() => PLACEHOLDER).join(',')
  const params = rows.flat()
  await db.$queryRawUnsafe(sql, ...params)
}

const main = async () => {
  if (!fs.existsSync(MY_FILE) || !fs.existsSync(PV_FILE)) {
    console.error('[g2l] метаданные не найдены в data/garments2look/ — сначала скачайте их (см. README раздела)')
    process.exit(1)
  }

  console.log('[g2l] чтение метаданных…')
  const my = readGzJson(MY_FILE)
  const pv = readGzJson(PV_FILE)
  console.log(`[g2l] mytheresa: ${Object.keys(my).length} товаров, polyvore: ${Object.keys(pv).length} товаров`)

  // 1) категория kids
  const kids = await db.category.upsert({
    where: { slug: 'kids' },
    update: {},
    create: { slug: 'kids', name: 'Kids', subtitle: 'Clothing and shoes for the youngest', icon: 'Baby', style: 9, sort: 5 },
  })
  const categories = await db.category.findMany()
  const catBySlug = new Map(categories.map((c) => [c.slug, c.id]))

  // 2) собираем подкатегории по маппингу
  const subPlan = new Map() // `${categorySlug}|${subLabel}` -> sort counter
  const pushSub = (mapping) => {
    const key = `${mapping.categorySlug}|${mapping.subLabel}`
    if (!subPlan.has(key)) subPlan.set(key, subPlan.size)
  }
  for (const [pid, item] of Object.entries(my)) pushSub(mapMytheresa(item, pid))
  for (const [key0, item] of Object.entries(pv)) pushSub(mapPolyvore(item, key0))

  console.log(`[g2l] подкатегорий к созданию: ${subPlan.size}`)
  for (const [key] of subPlan) {
    const [categorySlug, subLabel] = key.split('|')
    const categoryId = catBySlug.get(categorySlug)
    if (!categoryId) continue
    const slug = subSlugFor(categorySlug, subLabel)
    await db.subcategory.upsert({
      where: { slug },
      update: { name: subLabel, categoryId },
      create: { slug, name: subLabel, sort: subPlan.get(key), categoryId },
    })
  }
  const subcategories = await db.subcategory.findMany()
  const subIdBySlug = new Map(subcategories.map((s) => [`${s.categoryId}|${s.name}`, s.id]))

  // 3) товары — батчами INSERT OR IGNORE
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  let rows = []
  let insertedEstimate = 0
  let total = 0

  const flush = async () => {
    if (!rows.length) return
    await insertChunk(rows)
    insertedEstimate += rows.length
    rows = []
    if (insertedEstimate % 8000 < 44) console.log(`[g2l] обработано ${insertedEstimate} товаров…`)
  }

  for (const [pid, item] of Object.entries(my)) {
    const slug = `g2l-my-${String(pid).toLowerCase()}`
    rows.push(buildRow(slug, item, mapMytheresa(item), subIdBySlug, catBySlug, now))
    total++
    if (rows.length >= 40) await flush()
  }
  for (const [key0, item] of Object.entries(pv)) {
    const slug = `g2l-pv-${String(key0).toLowerCase()}`
    rows.push(buildRow(slug, item, mapPolyvore(item), subIdBySlug, catBySlug, now))
    total++
    if (rows.length >= 40) await flush()
  }
  await flush()

  const published = await db.product.count({ where: { published: true } })
  const staged = await db.product.count({ where: { slug: { startsWith: 'g2l-' } } })
  console.log(`[g2l] готово: прочитано ${total}, вставлено батчами ${insertedEstimate}`)
  console.log(`[g2l] товаров g2l в БД: ${staged}, всего в БД: ${await db.product.count()}, опубликовано: ${published}`)
}

main()
  .catch((e) => { console.error('[g2l] ошибка:', e); process.exit(1) })
  .finally(async () => { try { await db.$disconnect() } catch {} })
