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
  subcategories: Array.isArray(row.subcategories)
    ? row.subcategories.map((item) => toSubcategoryDTO(item))
    : [],
})

const toSubcategoryDTO = (row, count = null) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  sort: row.sort,
  categoryId: row.categoryId,
  ...(count !== null ? { count } : {}),
})

const toProductDTO = (row) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  // Реальный бренд товара (пусто — витрина показывает бренд магазина)
  brand: row.brand || '',
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
  decor: row.decor,
  // Собственная ссылка на оплату товара (customPayment = true → платим по paymentUrl)
  paymentUrl: row.paymentUrl || '',
  customPayment: row.customPayment === true,
  subcategoryId: row.subcategoryId ?? null,
  subcategory: row.subcategory
    ? { id: row.subcategory.id, slug: row.subcategory.slug, name: row.subcategory.name }
    : null,
  category: row.category
    ? { id: row.category.id, slug: row.category.slug, name: row.category.name, icon: row.category.icon, style: row.category.style }
    : null,
  createdAt: row.createdAt ? row.createdAt.toISOString() : null,
})

const toOrderDTO = (row) => ({
  id: row.id,
  code: row.code,
  userId: row.userId ?? null,
  paymentMode: row.paymentMode || 'system',
  customer: row.customer,
  phone: row.phone,
  address: row.address,
  comment: row.comment,
  total: row.total,
  status: row.status,
  items: parseJsonArray(row.items),
  createdAt: row.createdAt ? row.createdAt.toISOString() : null,
})

// Публичный профиль: без пароля, с флагами блокировки (нужны кабинету и админке)
const toUserDTO = (row) => ({
  id: row.id,
  login: row.login,
  name: row.name,
  blocked: row.blocked === true,
  banned: row.banned === true,
  createdAt: row.createdAt ? row.createdAt.toISOString() : null,
})

// Карточка пользователя в админке: плюс количество заказов
const toAdminUserDTO = (row) => ({
  ...toUserDTO(row),
  orderCount: row._count ? row._count.orders : null,
})

const toPaymentMethodDTO = (row) => ({
  id: row.id,
  userId: row.userId,
  label: row.label,
  brand: row.brand,
  last4: row.last4,
  expiry: row.expiry,
  isDefault: row.isDefault === true,
  createdAt: row.createdAt ? row.createdAt.toISOString() : null,
})

const DTO = { toProductDTO, toCategoryDTO, toSubcategoryDTO, toOrderDTO, toUserDTO, toAdminUserDTO, toPaymentMethodDTO }

export default DTO
