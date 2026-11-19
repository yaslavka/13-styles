// Тест подписанного уведомления DOKU: имитируем HTTP Notification с корректной
// подписью и проверяем, что наш notify-эндпоинт принимает и обрабатывает его.
// Запуск: node scripts/test-doku-notify.mjs <invoiceNumber> <amountIdr> <orderCode>

import crypto from 'node:crypto'

const [invoice, amountIdr, orderCode, clientId, secretKey] = process.argv.slice(2)

const body = JSON.stringify({
  service: { id: 'CREDIT_CARD' },
  acquirer: { id: 'BANK_MANDIRI' },
  channel: { id: 'CREDIT_CARD' },
  transaction: {
    status: 'SUCCESS',
    date: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    original_request_id: 'test-req-' + crypto.randomUUID().slice(0, 8),
  },
  order: { invoice_number: invoice, amount: Number(amountIdr) },
  card_payment: {
    masked_pan: '456789XXXXXX1234',
    card_brand: 'VISA',
    token: 'CARD-TOKEN-TEST-' + crypto.randomUUID().slice(0, 8),
  },
})

const requestId = crypto.randomUUID()
const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
const digest = crypto.createHash('sha256').update(body, 'utf8').digest('base64')
const stringToSign = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:/api/payments/doku/notify\nDigest:${digest}`
const signature = crypto.createHmac('sha256', secretKey).update(stringToSign).digest('base64')

const res = await fetch('http://localhost:3000/api/payments/doku/notify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Client-Id': clientId,
    'Request-Id': requestId,
    'Request-Timestamp': timestamp,
    'Signature': `HMACSHA256=${signature}`,
  },
  body,
})

console.log('HTTP:', res.status)
console.log('ответ:', JSON.stringify(await res.json()))
console.log(`заказ ${orderCode} должен стать confirmed, платёж — success`)
