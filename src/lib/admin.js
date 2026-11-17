import { createHmac, createHash, timingSafeEqual } from 'crypto'

// Админ-авторизация PIXART MARKET
// Пароль задаётся через env ADMIN_PASSWORD (по умолчанию 13styles2024).
// Токен — HMAC от пароля, передаётся клиентом в заголовке x-admin-key.

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '13styles2024'

const sha256 = (value) => createHash('sha256').update(String(value)).digest()

// Сравнение строк без утечки по времени (хэшируем обе стороны к одинаковой длине)
const safeEqual = (left, right) => {
  try {
    return timingSafeEqual(sha256(left), sha256(right))
  } catch {
    return false
  }
}

const adminToken = () => createHmac('sha256', String(ADMIN_PASSWORD)).update('pixart-admin-v1').digest('hex')

const verifyPassword = (password) => typeof password === 'string' && password.length > 0 && safeEqual(password, ADMIN_PASSWORD)

const requireAdmin = (request) => {
  const header = request?.headers?.get ? request.headers.get('x-admin-key') : ''
  return typeof header === 'string' && header.length > 0 && safeEqual(header, adminToken())
}

const ADMIN = { token: adminToken, verifyPassword, requireAdmin }

export default ADMIN
