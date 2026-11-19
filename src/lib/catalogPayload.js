// Общая валидация payload'а товара для админ-API (создание и обновление)
// Держим в одном месте, чтобы POST и PUT не расходились в правилах

const GENDER_VALUES = ['men', 'women', 'unisex']
const LABEL_VALUES = ['none', 'new', 'hit', 'sale']
const MAX_NAME_LENGTH = 120

const cleanStringArray = (value, maxItems) => {
  if (!Array.isArray(value)) return []
  const cleaned = value
    .filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
    .map((entry) => entry.trim())
  return Number.isInteger(maxItems) && maxItems > 0 ? cleaned.slice(0, maxItems) : cleaned
}

// Alt-тексты: массив строк той же длины, что и images (пустые строки допустимы —
// DTO сгенерирует авто-альт). Лишние хвосты отбрасываются.
const cleanAltArray = (value, maxItems) => {
  if (!Array.isArray(value)) return []
  const cleaned = value.map((entry) => (typeof entry === 'string' ? entry.trim().slice(0, 200) : ''))
  return Number.isInteger(maxItems) && maxItems > 0 ? cleaned.slice(0, maxItems) : cleaned
}

const normalizeStock = (value, fallback = 10) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(0, Math.floor(num))
}

const normalizeRating = (value, fallback = 4.8) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(5, Math.max(0, num))
}

const normalizeReviews = (value, fallback = 0) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.max(0, Math.floor(num))
}

// Валидное имя товара: строка 2..MAX_NAME_LENGTH
const isValidName = (name) => typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= MAX_NAME_LENGTH

// Валидная цена: конечное число > 0
const isValidPrice = (price) => Number.isFinite(Number(price)) && Number(price) > 0

// oldPrice засчитывается только если больше текущей цены
const resolveOldPrice = (value, price) => {
  const old = Number(value)
  return Number.isFinite(old) && old > price ? old : null
}

// Собственная ссылка на оплату: http(s)-URL либо пустая строка
const MAX_PAYMENT_URL_LENGTH = 500
const resolvePaymentUrl = (raw) => {
  if (typeof raw !== 'string') return ''
  const url = raw.trim().slice(0, MAX_PAYMENT_URL_LENGTH)
  return /^https?:\/\/\S+$/i.test(url) ? url : ''
}

// Проверка категории: возвращает id либо null
const resolveCategoryId = async (db, raw) => {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) return null
  const row = await db.category.findUnique({ where: { id } })
  return row ? id : null
}

// Проверка подкатегории: должна существовать и принадлежать категории товара
// Возвращает { id } либо { error }
const resolveSubcategoryId = async (db, raw, categoryId) => {
  if (raw === undefined || raw === null || raw === '' || raw === 0) return { id: null }
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) return { error: 'Некорректный идентификатор подкатегории' }
  const row = await db.subcategory.findUnique({ where: { id } })
  if (!row) return { error: 'Указанная подкатегория не найдена' }
  if (categoryId && row.categoryId !== categoryId) {
    return { error: 'Подкатегория не относится к категории товара' }
  }
  return { id }
}

const CATALOG_PAYLOAD = {
  GENDER_VALUES,
  LABEL_VALUES,
  MAX_NAME_LENGTH,
  cleanStringArray,
  cleanAltArray,
  normalizeStock,
  normalizeRating,
  normalizeReviews,
  isValidName,
  isValidPrice,
  resolveOldPrice,
  resolvePaymentUrl,
  resolveCategoryId,
  resolveSubcategoryId,
}

export default CATALOG_PAYLOAD
