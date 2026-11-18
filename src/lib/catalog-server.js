import { db } from '@/lib/db'
import CACHE from '@/lib/cache'
import DTO from '@/lib/dto'

// Серверный слой данных для SEO-страниц (SSR): категории, подкатегории,
// товары главной, страницы категорий/подкатегорий, карточка товара.

const PRODUCT_INCLUDE = { category: true, subcategory: true }

const getCategories = async () =>
  CACHE.wrap('ssr:categories:v2', 60000, async () => {
    const rows = await db.category.findMany({
      orderBy: { sort: 'asc' },
      include: {
        _count: { select: { products: { where: { published: true, decor: false } } } },
        subcategories: { orderBy: { sort: 'asc' } },
      },
    })
    return rows.map((row) => ({
      ...DTO.toCategoryDTO(row, row._count ? row._count.products : 0),
      subcategories: (row.subcategories || []).map((sub) => ({
        ...DTO.toSubcategoryDTO(sub),
      })),
    }))
  })

// Подсчёт товаров подкатегории (для подписей на страницах)
const getSubcategoryCounts = async () =>
  CACHE.wrap('ssr:subcategory-counts:v2', 60000, async () => {
    const grouped = await db.product.groupBy({
      by: ['subcategoryId'],
      where: { published: true, decor: false, subcategoryId: { not: null } },
      _count: { _all: true },
    })
    const map = new Map()
    grouped.forEach((row) => map.set(row.subcategoryId, row._count._all))
    return map
  })

// Главная: все категории + по 8 товаров каждой
const getCategorySections = async (perCategory = 8) => {
  const categories = await getCategories()
  const sections = await Promise.all(
    categories.map(async (category) => {
      const rows = await db.product.findMany({
        where: { published: true, decor: false, categoryId: category.id },
        include: PRODUCT_INCLUDE,
        orderBy: [{ featured: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
        take: perCategory,
      })
      return { category, products: rows.map((row) => DTO.toProductDTO(row)) }
    })
  )
  return sections
}

// Страница категории
const getCategoryBySlug = async (slug) => {
  const categories = await getCategories()
  return categories.find((category) => category.slug === slug) || null
}

const getSubcategoryBySlug = async (categorySlug, subSlug) => {
  const category = await getCategoryBySlug(categorySlug)
  if (!category) return null
  const subcategory = category.subcategories.find((sub) => sub.slug === subSlug) || null
  return subcategory ? { category, subcategory } : null
}

// Карточка товара (+ похожие из той же категории)
const getProductBySlug = async (slug) => {
  const numericId = /^\d+$/.test(String(slug)) ? Number(slug) : null
  const row = await db.product.findFirst({
    where: {
      published: true,
      decor: false,
      ...(numericId ? { id: numericId } : { slug: String(slug) }),
    },
    include: PRODUCT_INCLUDE,
  })
  if (!row) return null

  const relatedRows = await db.product.findMany({
    where: { published: true, decor: false, categoryId: row.categoryId, id: { not: row.id } },
    include: PRODUCT_INCLUDE,
    orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
    take: 4,
  })

  return {
    product: DTO.toProductDTO(row),
    related: relatedRows.map((relatedRow) => DTO.toProductDTO(relatedRow)),
  }
}

// Все слаги для sitemap
const getSitemapData = async () => {
  const [categories, products] = await Promise.all([
    getCategories(),
    db.product.findMany({
      where: { published: true, decor: false },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ])
  return { categories, products }
}

const CATALOG_SERVER = { getCategories, getSubcategoryCounts, getCategorySections, getCategoryBySlug, getSubcategoryBySlug, getProductBySlug, getSitemapData }

export default CATALOG_SERVER
