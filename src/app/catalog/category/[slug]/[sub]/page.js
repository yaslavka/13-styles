import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import CATALOG_SERVER from '@/lib/catalog-server'
import { SITE_URL } from '@/lib/constants'
import CatalogView from '@/components/catalog/CatalogView'

// Страница подкатегории /catalog/category/[slug]/[sub]: тот же список товаров,
// отфильтрованный по подкатегории — отдельная динамическая страница для SEO.

export const revalidate = 60

const loadData = async (slugParam, subParam) => {
  try {
    return await CATALOG_SERVER.getSubcategoryBySlug(decodeURIComponent(slugParam), decodeURIComponent(subParam))
  } catch (error) {
    console.error('[catalog/subcategory] ошибка загрузки:', error?.message || error)
    return null
  }
}

export async function generateMetadata({ params }) {
  const { slug, sub } = await params
  const data = await loadData(slug, sub)
  if (!data) return { title: 'Subcategory not found' }

  const { category, subcategory } = data
  const title = `${subcategory.name} — ${category.name}`
  const description = `${subcategory.name} in ${category.name}: cartoon-real items with filters by size, price and badges. 13 STYLES — delivery across Europe in 1–3 days, 14-day returns.`

  return {
    title,
    description,
    alternates: { canonical: `/catalog/category/${category.slug}/${subcategory.slug}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${SITE_URL}/catalog/category/${category.slug}/${subcategory.slug}`,
    },
  }
}

const SubcategoryPage = async ({ params }) => {
  const { slug, sub } = await params
  const data = await loadData(slug, sub)
  if (!data) notFound()

  let categories = []
  try {
    categories = await CATALOG_SERVER.getCategories()
  } catch (error) {
    console.error('[catalog/subcategory] БД недоступна:', error?.message || error)
  }

  const { category, subcategory } = data
  const subUrl = `${SITE_URL}/catalog/category/${category.slug}/${subcategory.slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${subUrl}#collection`,
        url: subUrl,
        name: `${subcategory.name} — ${category.name}`,
        inLanguage: 'en',
        isPartOf: { '@id': `${SITE_URL}#website` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '13 STYLES', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Catalog', item: `${SITE_URL}/catalog` },
          { '@type': 'ListItem', position: 3, name: category.name, item: `${SITE_URL}/catalog/category/${category.slug}` },
          { '@type': 'ListItem', position: 4, name: subcategory.name, item: subUrl },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense>
        <CatalogView categories={categories} lockedCategory={category.slug} lockedSub={subcategory.slug} />
      </Suspense>
    </>
  )
}

export default SubcategoryPage
