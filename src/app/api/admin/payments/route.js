import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ADMIN from '@/lib/admin'
import { ensureMerchantsFromEnv, getSettings, setSetting, DOKU_HOSTS } from '@/lib/doku'

export const dynamic = 'force-dynamic'

// GET  /api/admin/payments — настройки DOKU: мерчанты, глобальные параметры, платежи
// PUT  /api/admin/payments — сохранить мерчанты и настройки (только админ)

const maskSecret = (value) => {
  const s = String(value || '')
  if (!s) return ''
  if (s.length <= 8) return '••••'
  return `${s.slice(0, 4)}••••${s.slice(-4)}`
}

const GET = async (request) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const seeded = await ensureMerchantsFromEnv()
    const merchants = await db.paymentMerchant.findMany({ orderBy: [{ isDefault: 'desc' }, { code: 'asc' }] })
    const settings = await getSettings()
    const payments = await db.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
    const grouped = await db.payment.groupBy({ by: ['status'], _count: { _all: true } })

    return NextResponse.json({
      merchants: merchants.map((m) => ({
        ...m,
        secretKeyMasked: maskSecret(m.secretKey),
        sandboxSecretKeyMasked: maskSecret(m.sandboxSecretKey),
      })),
      settings,
      hosts: DOKU_HOSTS,
      env: {
        dokuEnv: process.env.DOKU_ENV || '',
        notifyAllowUnverifiedEnv: process.env.DOKU_NOTIFY_ALLOW_UNVERIFIED === 'true',
        eurIdrRateEnv: process.env.DOKU_EUR_IDR_RATE || '',
      },
      seeded,
      payments: payments.map((p) => ({
        id: p.id,
        orderCode: p.orderCode,
        merchantCode: p.merchantCode,
        amountEur: p.amountEur,
        amountIdr: p.amountIdr,
        rate: p.rate,
        status: p.status,
        channel: p.channel,
        invoiceNumber: p.invoiceNumber,
        payUrl: p.payUrl,
        mode: p.mode,
        hasCardToken: Boolean(p.cardToken),
        cardLast4: p.cardLast4,
        createdAt: p.createdAt,
      })),
      stats: Object.fromEntries(grouped.map((g) => [g.status, g._count._all])),
    })
  } catch (error) {
    console.error('[api/admin/payments] ошибка GET:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось загрузить настройки платежей' }, { status: 500 })
  }
}

const PUT = async (request) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const merchants = Array.isArray(body?.merchants) ? body.merchants : []
    const settings = body?.settings || {}

    for (const m of merchants) {
      const code = String(m.code || '').trim()
      if (!code) continue
      const data = {
        name: String(m.name || code).slice(0, 40),
        clientId: String(m.clientId ?? '').slice(0, 120),
        secretKey: String(m.secretKey ?? '').slice(0, 300),
        apiKey: String(m.apiKey ?? '').slice(0, 300),
        mode: m.mode === 'sandbox' ? 'sandbox' : 'production',
        sandboxClientId: String(m.sandboxClientId ?? '').slice(0, 120),
        sandboxSecretKey: String(m.sandboxSecretKey ?? '').slice(0, 300),
        enabled: m.enabled === true,
        isDefault: m.isDefault === true,
      }
      await db.paymentMerchant.upsert({
        where: { code },
        update: data,
        create: { code, ...data },
      })
      if (data.isDefault) {
        // Дефолтный мерчант один: снимаем флаг с остальных
        const others = await db.paymentMerchant.findMany({ where: { isDefault: true, code: { not: code } } })
        for (const other of others) {
          await db.paymentMerchant.update({ where: { id: other.id }, data: { isDefault: false } })
        }
      }
    }

    // Глобальные настройки
    if ('siteUrl' in settings) await setSetting('site.url', String(settings.siteUrl || '').trim().replace(/\/+$/, ''))
    if ('notifyAllowUnverified' in settings) await setSetting('doku.notifyAllowUnverified', settings.notifyAllowUnverified === true)
    if ('eurIdrFallback' in settings) await setSetting('doku.eurIdrFallback', Number(settings.eurIdrFallback) || 17500)
    if ('paymentDueMinutes' in settings) await setSetting('doku.paymentDueMinutes', Number(settings.paymentDueMinutes) || 60)
    if ('customerTokenization' in settings) await setSetting('doku.customerTokenization', settings.customerTokenization === true)

    const updated = await db.paymentMerchant.findMany({ orderBy: [{ isDefault: 'desc' }, { code: 'asc' }] })
    return NextResponse.json({ ok: true, merchants: updated })
  } catch (error) {
    console.error('[api/admin/payments] ошибка PUT:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось сохранить настройки платежей' }, { status: 500 })
  }
}

export { GET, PUT }
