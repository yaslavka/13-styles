import { SITE_URL } from '@/lib/constants'
import CATALOG_SERVER from '@/lib/catalog-server'

// sitemap.xml 13 STYLES: статические витринные маршруты + все категории,
// подкатегории и КАЖДЫЙ опубликованный товар (SEO-требование проекта).
// Порядок: главная → каталог → стили → категории → подкатегории → товары.
// При сбое БД отдаём статические маршруты, чтобы sitemap.xml никогда не падал.

const buildSitemap = async () => {
  const now = new Date()

  // Статические маршруты витрины
  const staticEntries = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/catalog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/styles`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]

  try {
    const { categories, products } = await CATALOG_SERVER.getSitemapData()

    // Категории: /catalog/category/{slug}
    const categoryEntries = (categories || []).map((category) => ({
      url: `${SITE_URL}/catalog/category/${category.slug}`,
      changeFrequency: 'daily',
      priority: 0.8,
    }))

    // Подкатегории: /catalog/category/{categorySlug}/{subcategory.slug}
    const subcategoryEntries = (categories || []).flatMap((category) =>
      (category.subcategories || []).map((subcategory) => ({
        url: `${SITE_URL}/catalog/category/${category.slug}/${subcategory.slug}`,
        changeFrequency: 'daily',
        priority: 0.8,
      }))
    )

    // Каждый товар: /product/{slug} с датой последнего изменения
    const productEntries = (products || [])
      .filter((product) => product && product.slug)
      .map((product) => ({
        url: `${SITE_URL}/product/${product.slug}`,
        lastModified: product.updatedAt || now,
        changeFrequency: 'weekly',
        priority: 0.7,
      }))

    return [...staticEntries, ...categoryEntries, ...subcategoryEntries, ...productEntries]
  } catch (error) {
    // База недоступна (импорт/миграция) — sitemap остаётся валидным
    console.error('[sitemap] getSitemapData failed, falling back to static routes:', error?.message)
    return staticEntries
  }
}

const sitemap = async () => buildSitemap()

export default sitemap
