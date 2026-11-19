import crypto from 'node:crypto'
import { db } from '@/lib/db'

// Интеграция DOKU (Non-SNAP Checkout API): подпись HMACSHA256, конвертация
// EUR->IDR, уведомления (HTTP Notification), токенизация карт через customer.id.
// Доки: developers.doku.com/accept-payments/doku-checkout/integration-guide/backend-integration

export const DOKU_HOSTS = {
  production: 'https://api.doku.com',
  sandbox: 'https://api-sandbox.doku.com',
}

// Мерчанты, импортируемые из .env (DOKU_<CODE>_CLIENT_ID и т.д.)
const MERCHANT_CODES = [
  { code: 'funstay', name: 'FUNSTAY', isDefault: true },
  { code: 'skyview', name: 'SKYVIEW' },
  { code: 'mpm', name: 'MPM' },
  { code: 'tsa', name: 'TSA' },
  { code: 'arbivura', name: 'ARBIVURA' },
]

const envKey = (code, suffix) => process.env[`DOKU_${code.toUpperCase()}_${suffix}`] || ''

// --- Подпись ---------------------------------------------------------------
// stringToSign: Client-Id:...\nRequest-Id:...\nRequest-Timestamp:...\nRequest-Target:...\nDigest:...
// Digest = base64(SHA256(rawBody)); Signature = base64(HMAC-SHA256(secretKey, stringToSign))

export const buildStringToSign = ({ clientId, requestId, timestamp, target, digest }) =>
  `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${target}\nDigest:${digest}`

export const digestOf = (rawBody) =>
  crypto.createHash('sha256').update(rawBody, 'utf8').digest('base64')

export const signRequest = ({ secretKey, clientId, requestId, timestamp, target, rawBody }) => {
  const digest = digestOf(rawBody)
  const stringToSign = buildStringToSign({ clientId, requestId, timestamp, target, digest })
  return crypto.createHmac('sha256', secretKey).update(stringToSign).digest('base64')
}

// Проверка уведомления от DOKU (Request-Target = путь нашего notify-URL)
export const verifyNotifySignature = ({ headers, rawBody, targetPath, secretKey }) => {
  const clientId = headers['client-id'] || ''
  const requestId = headers['request-id'] || ''
  const timestamp = headers['request-timestamp'] || ''
  const signature = (headers['signature'] || '').replace(/^HMACSHA256=/, '')
  if (!clientId || !signature) return false
  const expected = signRequest({ secretKey, clientId, requestId, timestamp, target: targetPath, rawBody })
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// --- Курс EUR -> IDR -------------------------------------------------------
// DOKU Checkout принимает сумму без десятичных (IDR по умолчанию), поэтому
// конвертация делается на нашей стороне: живой курс с кэшем 30 минут,
// при недоступности API — fallback из .env (DOKU_EUR_IDR_RATE).

let rateCache = { value: 0, fetchedAt: 0 }

export const getEurIdrRate = async () => {
  const fallback = Number(process.env.DOKU_EUR_IDR_RATE || 17500)
  const now = Date.now()
  if (rateCache.value > 0 && now - rateCache.fetchedAt < 30 * 60 * 1000) {
    return { rate: rateCache.value, source: rateCache.source }
  }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch('https://open.er-api.com/v6/latest/EUR', { signal: controller.signal })
    clearTimeout(timer)
    const json = await res.json()
    const idr = Number(json?.rates?.IDR)
    if (Number.isFinite(idr) && idr > 1000) {
      rateCache = { value: idr, fetchedAt: now, source: 'live' }
      return { rate: idr, source: 'live' }
    }
  } catch (error) {
    console.error('[doku] живой курс недоступен:', error?.message || error)
  }
  rateCache = { value: fallback, fetchedAt: now, source: 'fallback' }
  return { rate: fallback, source: 'fallback' }
}

export const eurToIdr = (eur, rate) => Math.max(1, Math.round(Number(eur) * rate))

// --- Мерчанты ---------------------------------------------------------------

export const ensureMerchantsFromEnv = async () => {
  const created = []
  for (const m of MERCHANT_CODES) {
    const clientId = envKey(m.code, 'CLIENT_ID')
    if (!clientId) continue
    const existing = await db.paymentMerchant.findUnique({ where: { code: m.code } })
    if (existing) {
      // Обновляем ключи из .env, только если в БД пусто (в админке важнее ручные правки)
      const patch = {}
      if (!existing.clientId) patch.clientId = clientId
      if (!existing.secretKey) patch.secretKey = envKey(m.code, 'SECRET_KEY')
      if (!existing.apiKey) patch.apiKey = envKey(m.code, 'API_KEY')
      if (Object.keys(patch).length) {
        await db.paymentMerchant.update({ where: { id: existing.id }, data: patch })
        created.push(`${m.code}: обновлён из .env`)
      }
      continue
    }
    await db.paymentMerchant.create({
      data: {
        code: m.code,
        name: m.name,
        clientId,
        secretKey: envKey(m.code, 'SECRET_KEY'),
        apiKey: envKey(m.code, 'API_KEY'),
        mode: process.env.DOKU_ENV === 'sandbox' ? 'sandbox' : 'production',
        isDefault: m.isDefault === true,
      },
    })
    created.push(`${m.code}: создан из .env`)
  }
  // Страховка: если ни один не помечен дефолтным — FUNSTAY
  const anyDefault = await db.paymentMerchant.findFirst({ where: { isDefault: true } })
  if (!anyDefault) {
    const funstay = await db.paymentMerchant.findUnique({ where: { code: 'funstay' } })
    if (funstay) await db.paymentMerchant.update({ where: { id: funstay.id }, data: { isDefault: true } })
  }
  return created
}

export const getDefaultMerchant = async () => {
  await ensureMerchantsFromEnv()
  return (
    (await db.paymentMerchant.findFirst({ where: { isDefault: true, enabled: true } })) ||
    (await db.paymentMerchant.findFirst({ where: { enabled: true } }))
  )
}

// Ключи и хост под выбранный режим мерчанта
export const merchantCredentials = (merchant) => {
  const mode = merchant.mode === 'sandbox' ? 'sandbox' : 'production'
  return {
    mode,
    host: DOKU_HOSTS[mode],
    clientId: mode === 'sandbox' ? (merchant.sandboxClientId || merchant.clientId) : merchant.clientId,
    secretKey: mode === 'sandbox' ? (merchant.sandboxSecretKey || merchant.secretKey) : merchant.secretKey,
  }
}

// --- Создание платежа в DOKU Checkout --------------------------------------

export const createCheckoutPayment = async ({ merchant, body, target = '/checkout/v1/payment' }) => {
  const { mode, host, clientId, secretKey } = merchantCredentials(merchant)
  const requestId = crypto.randomUUID()
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const rawBody = JSON.stringify(body)
  const signature = signRequest({ secretKey, clientId, requestId, timestamp, target, rawBody })

  const res = await fetch(`${host}${target}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': clientId,
      'Request-Id': requestId,
      'Request-Timestamp': timestamp,
      'Signature': `HMACSHA256=${signature}`,
    },
    body: rawBody,
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, mode, requestId, json }
}

// --- Настройки (Setting) ----------------------------------------------------

export const getSettings = async () => {
  const rows = await db.setting.findMany()
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]))
  return {
    // Публичный адрес сайта для callback/redirect URL (настройка в админке
    // важнее NEXT_PUBLIC_SITE_URL: её можно поменять без пересборки)
    siteUrl: String(map['site.url'] || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, ''),
    notifyAllowUnverified:
      map['doku.notifyAllowUnverified'] !== undefined
        ? map['doku.notifyAllowUnverified'] === 'true'
        : process.env.DOKU_NOTIFY_ALLOW_UNVERIFIED === 'true',
    eurIdrFallback: Number(map['doku.eurIdrFallback'] || process.env.DOKU_EUR_IDR_RATE || 17500),
    paymentDueMinutes: Number(map['doku.paymentDueMinutes'] || 60),
    customerTokenization: (map['doku.customerTokenization'] ?? 'true') === 'true',
  }
}

export const setSetting = async (key, value) => {
  await db.setting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  })
}
