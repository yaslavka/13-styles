import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ADMIN from '@/lib/admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/payments/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
// Суммы и количество платежей по каждому статусу за выбранный период
// (без параметров — за всё время). Используется блоком «Статистика платежей»
// в разделе админки «Платежи DOKU».
const GET = async (request) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const fromRaw = String(searchParams.get('from') || '').trim()
    const toRaw = String(searchParams.get('to') || '').trim()

    const where = {}
    if (fromRaw || toRaw) {
      where.createdAt = {}
      if (fromRaw) {
        const from = new Date(`${fromRaw}T00:00:00`)
        if (!Number.isNaN(from.getTime())) where.createdAt.gte = from
      }
      if (toRaw) {
        const to = new Date(`${toRaw}T23:59:59.999`)
        if (!Number.isNaN(to.getTime())) where.createdAt.lte = to
      }
    }

    const groups = await db.payment.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
      _sum: { amountEur: true, amountIdr: true },
    })

    const stats = {}
    for (const group of groups) {
      stats[group.status] = {
        count: group._count._all || 0,
        sumEur: Number(group._sum.amountEur || 0),
        sumIdr: Number(group._sum.amountIdr || 0),
      }
    }

    return NextResponse.json({ stats, range: { from: fromRaw || null, to: toRaw || null } })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Не удалось собрать статистику' }, { status: 500 })
  }
}

export { GET }
