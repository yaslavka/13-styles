import { discountPercent } from './constants'

// DTO-слой: превращает строки Prisma (JSON-строки) в готовые объекты для фронта

const parseJsonArray = (raw, fallback = []) => {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

const toCategoryDTO = (row, count = 0) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  subtitle: row.subtitle,
  icon: row.icon,
  style: row.style,
  sort: row.sort,
  count,
})

const toProductDTO = (row) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  shortDesc: row.shortDesc,
  description: row.description,
  price: row.price,
  oldPrice: row.oldPrice ?? null,
  discountPercent: discountPercent(row.price, row.oldPrice),
  gender: row.gender,
  sizes: parseJsonArray(row.sizes),
  colors: parseJsonArray(row.colors),
  images: parseJsonArray(row.images),
  label: row.label,
  stock: row.stock,
  rating: row.rating,
  reviews: row.reviews,
  featured: row.featured,
  published: row.published,
  category: row.category
    ? { id: row.category.id, slug: row.category.slug, name: row.category.name, icon: row.category.icon, style: row.category.style }
    : null,
  createdAt: row.createdAt ? row.createdAt.toISOString() : null,
})

const toOrderDTO = (row) => ({
  id: row.id,
  code: row.code,
  customer: row.customer,
  phone: row.phone,
  address: row.address,
  comment: row.comment,
  total: row.total,
  status: row.status,
  items: parseJsonArray(row.items),
  createdAt: row.createdAt ? row.createdAt.toISOString() : null,
})

const DTO = { toProductDTO, toCategoryDTO, toOrderDTO }

export default DTO
