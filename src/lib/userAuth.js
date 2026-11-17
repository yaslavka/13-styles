import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'

// Авторизация покупателей 13 STYLES: логин + пароль (scrypt), токен — подпись HMAC.
// Токен передаётся клиентом в заголовке x-user-key.

const SESSION_SECRET = process.env.USER_AUTH_SECRET || '13styles-user-session-v1'

const LOGIN_PATTERN = /^[a-zA-Z0-9_.-]{3,40}$/
const MIN_PASSWORD_LENGTH = 6
const MAX_NAME_LENGTH = 80

// Выравнивание обеих строк к одной длине для безопасного сравнения
const sha256 = (value) => createHash('sha256').update(String(value)).digest()

const safeEqual = (left, right) => {
  try {
    return timingSafeEqual(sha256(left), sha256(right))
  } catch {
    return false
  }
}

// Пароль хранится как "salt:hash" (scrypt, 64 байта)
const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password), salt, 64).toString('hex')
  return `${salt}:${hash}`
}

const verifyPassword = (password, stored) => {
  const [salt, hash] = String(stored || '').split(':')
  if (!salt || !hash) return false
  try {
    const candidate = scryptSync(String(password), salt, 64)
    const expected = Buffer.from(hash, 'hex')
    return candidate.length === expected.length && timingSafeEqual(candidate, expected)
  } catch {
    return false
  }
}

const isValidLogin = (login) => typeof login === 'string' && LOGIN_PATTERN.test(login)

const isValidPassword = (password) => typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH

const cleanName = (name) => (typeof name === 'string' ? name.trim().slice(0, MAX_NAME_LENGTH) : '')

const userSignature = (id) => createHmac('sha256', SESSION_SECRET).update(`user:${id}`).digest('hex')

// Токен: "<id>.<подпись>"
const issueToken = (id) => `${id}.${userSignature(id)}`

// Разбор токена: возвращает id пользователя либо null
const resolveToken = (token) => {
  const [rawId, signature] = String(token || '').split('.')
  const id = parseInt(rawId, 10)
  if (!Number.isInteger(id) || id <= 0 || !signature) return null
  return safeEqual(signature, userSignature(id)) ? id : null
}

// Достаёт пользователя из заголовка x-user-key; возвращает id или null
const requireUser = (request) => {
  const header = request?.headers?.get ? request.headers.get('x-user-key') : ''
  return resolveToken(header)
}

const USER_AUTH = {
  hashPassword,
  verifyPassword,
  isValidLogin,
  isValidPassword,
  cleanName,
  issueToken,
  resolveToken,
  requireUser,
  MIN_PASSWORD_LENGTH,
}

export default USER_AUTH
