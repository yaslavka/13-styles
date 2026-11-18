import { Suspense } from 'react'
import CATALOG_SERVER from '@/lib/catalog-server'
import { SITE_URL } from '@/lib/constants'
import CatalogView from '@/components/catalog/CatalogView'

// Каталог /catalog: все товары, фильтры по всем параметрам (сайдбар на десктопе,
// боттомщит на мобильном). SEO-метаданные + JSON-LD.

export const revalidate = 60

export const metadata = {
  title: 'Catalog — clothing, shoes & accessories',
  description:
    'Browse the full 13 STYLES catalog: streetwear clothing, sneakers and accessories. Filter by category, subcategory, size, price, gender and badges NEW / TOP / SALE.',
  alternates: { canonical: '/catalog' },
}

const CatalogPage = async () => {
  let categories = []
  try {
    categories = await CATALOG_SERVER.getCategories()
  } catch (error) {
    console.error('[catalog] БД недоступна:', error?.message || error)
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/catalog#collection`,
        url: `${SITE_URL}/catalog`,
        name: 'Catalog — 13 STYLES',
        inLanguage: 'en',
        isPartOf: { '@id': `${SITE_URL}#website` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '13 STYLES', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Catalog', item: `${SITE_URL}/catalog` },
        ],
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense>
        <CatalogView categories={categories} />
      </Suspense>
    </>
  )
}

export default CatalogPage
