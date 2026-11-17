import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ADMIN from '@/lib/admin'
import DTO from '@/lib/dto'

export const dynamic = 'force-dynamic'

// GET /api/admin/stats — сводка для дашборда админки
const GET = async (request) => {
  if (!ADMIN.requireAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [
      productsTotal,
      publishedTotal,
      ordersTotal,
      newOrdersTotal,
      revenueAgg,
      lowStockRows,
      recentOrderRows,
      categoryRows,
      topProductRows,
    ] = await Promise.all([
      db.product.count(),
      db.product.count({ where: { published: true } }),
      db.order.count(),
      db.order.count({ where: { status: 'new' } }),
      db.order.aggregate({
        _sum: { total: true },
        where: { status: { not: 'canceled' } },
      }),
      db.product.findMany({
        where: { published: true, stock: { lte: 3 } },
        take: 5,
        orderBy: { stock: 'asc' },
        include: { category: true },
      }),
      db.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      db.category.findMany({
        orderBy: { sort: 'asc' },
        include: {
          _count: {
            select: {
              products: { where: { published: true } },
            },
          },
        },
      }),
      db.product.findMany({
        where: { published: true },
        orderBy: [{ rating: 'desc' }, { reviews: 'desc' }],
        take: 5,
        include: { category: true },
      }),
    ])

    const stats = {
      products: productsTotal,
      published: publishedTotal,
      orders: ordersTotal,
      newOrders: newOrdersTotal,
      revenue: revenueAgg._sum?.total || 0,
      lowStock: lowStockRows.map((row) => DTO.toProductDTO(row)),
      recentOrders: recentOrderRows.map((row) => DTO.toOrderDTO(row)),
      categoryCounts: categoryRows.map((row) => DTO.toCategoryDTO(row, row._count ? row._count.products : 0)),
      topProducts: topProductRows.map((row) => DTO.toProductDTO(row)),
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('[api/admin/stats] ошибка загрузки статистики:', error?.message || error)
    return NextResponse.json({ error: 'Не удалось загрузить статистику' }, { status: 500 })
  }
}

export { GET }
