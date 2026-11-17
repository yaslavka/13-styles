// Бренд, палитра и 13 градиентных стилей 13 STYLES
// Витрина мультиязычная (36 европейских языков), админ-панель — на русском.
// Чистые данные без зависимостей (используются и на клиенте, и в seed-скриптах)

export const BRAND = '13 STYLES'

export const SITE_NAME = '13 STYLES'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://13styles.example'

export const AGE_LABEL = '16–50'

export const DEFAULT_LOCALE = 'en'

// Фирменная палитра: чёрный, синий, фиолетовый, светло-фиолетовый, оранжевый, светло-оранжевый
export const PALETTE = {
  black: '#07070f',
  ink: '#0e0e1c',
  coal: '#161228',
  blue: '#3b82f6',
  blueDeep: '#1d4ed8',
  blueSoft: '#93c5fd',
  purple: '#8b5cf6',
  purpleDeep: '#6d28d9',
  lavender: '#a78bfa',
  lilac: '#c4b5fd',
  orange: '#f97316',
  orangeDeep: '#ea580c',
  peach: '#fdba74',
  apricot: '#fed7aa',
  white: '#f8fafc',
}

// 13 фирменных градиентных стилей: colors — фон карточек/секций, accent — свечение
export const STYLES = [
  { id: 0, name: 'Neon Noir', colors: ['#141126', '#7c3aed', '#141126'], accent: '#a78bfa' },
  { id: 1, name: 'Electro Blue', colors: ['#0a1230', '#2563eb', '#0a1230'], accent: '#60a5fa' },
  { id: 2, name: 'Indie Sunset', colors: ['#1d1030', '#8b5cf6', '#f97316'], accent: '#fdba74' },
  { id: 3, name: 'Violet Storm', colors: ['#170b2e', '#8b5cf6', '#c4b5fd'], accent: '#c4b5fd' },
  { id: 4, name: 'Cyber Orange', colors: ['#230f08', '#f97316', '#8b5cf6'], accent: '#f97316' },
  { id: 5, name: 'Deep Space', colors: ['#05050f', '#1d4ed8', '#05050f'], accent: '#3b82f6' },
  { id: 6, name: 'Amethyst', colors: ['#1c1134', '#a78bfa', '#2563eb'], accent: '#a78bfa' },
  { id: 7, name: 'Lava Lamp', colors: ['#240d05', '#f97316', '#fdba74'], accent: '#fdba74' },
  { id: 8, name: 'Moon Glow', colors: ['#100a24', '#c4b5fd', '#8b5cf6'], accent: '#ddd6fe' },
  { id: 9, name: 'Blue Rise', colors: ['#081226', '#3b82f6', '#a78bfa'], accent: '#93c5fd' },
  { id: 10, name: 'Pixel Sunrise', colors: ['#1e0e06', '#fdba74', '#f97316'], accent: '#fed7aa' },
  { id: 11, name: 'Night Glow', colors: ['#0b0b18', '#6d28d9', '#3b82f6'], accent: '#a78bfa' },
  { id: 12, name: 'Peach Magic', colors: ['#1f0d16', '#fed7aa', '#8b5cf6'], accent: '#fed7aa' },
]

// Стартовый состав категорий каталога (используется seed-скриптом)
export const CATEGORIES_SEED = [
  { slug: 'men', name: "Men's clothing", subtitle: 'Streetwear for guys 16–50', icon: 'Shirt', style: 1, sort: 1 },
  { slug: 'women', name: "Women's clothing", subtitle: 'Looks for girls 16–50', icon: 'Sparkles', style: 3, sort: 2 },
  { slug: 'shoes', name: 'Shoes', subtitle: 'Sneakers, boots, high-tops', icon: 'Footprints', style: 4, sort: 3 },
  { slug: 'accessories', name: 'Accessories', subtitle: 'Caps, backpacks, shades, watches', icon: 'Watch', style: 7, sort: 4 },
]

export const GENDERS = [
  { value: 'all', key: 'gender.all' },
  { value: 'men', key: 'gender.men' },
  { value: 'women', key: 'gender.women' },
  { value: 'unisex', key: 'gender.unisex' },
]

export const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45']

// Лейблы товаров (бейджи на карточках) — универсальные латинские, локализация не требуется
export const LABELS = {
  none: null,
  new: { text: 'NEW', style: 9 },
  hit: { text: 'TOP', style: 4 },
  sale: { text: 'SALE', style: 7 },
}

export const SORT_OPTIONS = [
  { value: 'new', key: 'sort.new' },
  { value: 'price-asc', key: 'sort.price-asc' },
  { value: 'price-desc', key: 'sort.price-desc' },
  { value: 'discount', key: 'sort.discount' },
  { value: 'rating', key: 'sort.rating' },
]

export const ORDER_STATUSES = [
  { value: 'new', name: 'Новый', tone: '#f97316' },
  { value: 'confirmed', name: 'Подтверждён', tone: '#8b5cf6' },
  { value: 'shipped', name: 'Отправлен', tone: '#3b82f6' },
  { value: 'done', name: 'Выполнен', tone: '#22c55e' },
  { value: 'canceled', name: 'Отменён', tone: '#ef4444' },
]

export const PRICE_LIMITS = { min: 0, max: 500 }

export const DEFAULT_PAGE_SIZE = 12

// Форматирование цены в евро с учётом текущей локали витрины
export const formatPrice = (value, locale = 'en') => {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(safe)
  } catch {
    return `€${Math.round(safe)}`
  }
}

// Процент скидки на основе старой цены
export const discountPercent = (price, oldPrice) => {
  const p = Number(price)
  const old = Number(oldPrice)
  if (!old || old <= p) return 0
  return Math.round((1 - p / old) * 100)
}

// slug из произвольного текста
export const slugify = (text) => {
  const base = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'item'
}

// CSS linear-gradient по одному из 13 стилей
export const styleGradient = (styleIndex, angle = 135) => {
  const style = STYLES[((styleIndex % STYLES.length) + STYLES.length) % STYLES.length]
  return `linear-gradient(${angle}deg, ${style.colors[0]}, ${style.colors[1]}, ${style.colors[2]})`
}

// Градиент для переливающегося текста
export const styleTextGradient = (styleIndex) => {
  const style = STYLES[((styleIndex % STYLES.length) + STYLES.length) % STYLES.length]
  return `linear-gradient(100deg, ${style.colors[1]} 0%, ${style.accent} 25%, ${PALETTE.white} 50%, ${style.accent} 75%, ${style.colors[2]} 100%)`
}

const CONSTANTS = {
  BRAND,
  SITE_NAME,
  SITE_URL,
  AGE_LABEL,
  PALETTE,
  STYLES,
  CATEGORIES_SEED,
  GENDERS,
  CLOTHING_SIZES,
  SHOE_SIZES,
  LABELS,
  SORT_OPTIONS,
  ORDER_STATUSES,
  PRICE_LIMITS,
  DEFAULT_PAGE_SIZE,
  formatPrice,
  discountPercent,
  slugify,
  styleGradient,
  styleTextGradient,
}

export default CONSTANTS
