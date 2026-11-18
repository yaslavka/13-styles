import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CATALOG_SERVER from '@/lib/catalog-server'
import { SITE_URL } from '@/lib/constants'
import CatalogView from '@/components/catalog/CatalogView'

// Страница категории /catalog/category/[slug]: динамический SEO-маршрут —
// тот же список товаров, отфильтрованный по категории.

export const revalidate = 60

const loadCategory = async (slugParam) => {
  try {
    return await CATALOG_SERVER.getCategoryBySlug(decodeURIComponent(slugParam))
  } catch (error) {
    console.error('[catalog/category] ошибка загрузки:', error?.message || error)
    return null
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const category = await loadCategory(slug)
  if (!category) return { title: 'Category not found' }

  const title = `${category.name} — buy online`
  const description = `${category.name}: ${category.subtitle}. ${category.count} items with filters by subcategory, size and price. 13 STYLES — cartoon-real marketplace, delivery across Europe in 1–3 days.`

  return {
    title,
    description,
    alternates: { canonical: `/catalog/category/${category.slug}` },
    openGraph: { type: 'website', title, description, url: `${SITE_URL}/catalog/category/${category.slug}` },
  }
}

const CategoryPage = async ({ params }) => {
  const { slug } = await params
  const category = await loadCategory(slug)
  if (!category) notFound()

  let categories = []
  try {
    categories = await CATALOG_SERVER.getCategories()
  } catch (error) {
    console.error('[catalog/category] БД недоступна:', error?.message || error)
  }

  const categoryUrl = `${SITE_URL}/catalog/category/${category.slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${categoryUrl}#collection`,
        url: categoryUrl,
        name: category.name,
        description: category.subtitle,
        inLanguage: 'en',
        isPartOf: { '@id': `${SITE_URL}#website` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '13 STYLES', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Catalog', item: `${SITE_URL}/catalog` },
          { '@type': 'ListItem', position: 3, name: category.name, item: categoryUrl },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CatalogView categories={categories} lockedCategory={category.slug} />

      {/* SEO-перелинковка: все подкатегории категории отдельными страницами */}
      {category.subcategories?.length ? (
        <nav aria-label={`${category.name} subcategories`} className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <h2 className="mb-4 font-display text-xl font-bold text-purple-200">{category.name}: subcategories</h2>
          <div className="flex flex-wrap gap-2">
            {category.subcategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/catalog/category/${category.slug}/${sub.slug}`}
                className="glass-btn glass-btn-ghost rounded-full px-3.5 py-1.5 text-xs font-bold text-purple-200 transition-colors hover:text-white"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </>
  )
}

export default CategoryPage
