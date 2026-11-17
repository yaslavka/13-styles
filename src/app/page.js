import { db } from '@/lib/db'
import CACHE from '@/lib/cache'
import DTO from '@/lib/dto'
import { SITE_NAME, SITE_URL, AGE_LABEL } from '@/lib/constants'
import AppShell from '@/components/layout/AppShell'

// Единственный пользовательский маршрут /. Серверная часть:
// SSR начальных данных для SEO + JSON-LD структурированные данные.

const Page = async () => {
  let initialCategories = []
  let initialProducts = []

  try {
    initialCategories = await CACHE.wrap('ssr:categories', 60000, async () => {
      const rows = await db.category.findMany({
        orderBy: { sort: 'asc' },
        include: { _count: { select: { products: { where: { published: true } } } } },
      })
      return rows.map((row) => DTO.toCategoryDTO(row, row._count ? row._count.products : 0))
    })

    initialProducts = await CACHE.wrap('ssr:featured', 20000, async () => {
      const rows = await db.product.findMany({
        where: { published: true, featured: true },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      })
      return rows.map((row) => DTO.toProductDTO(row))
    })
  } catch (error) {
    console.error('[page] БД недоступна, показываем витрину без данных:', error?.message || error)
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        description: `A cartoon-real marketplace for clothing, shoes and accessories for ${AGE_LABEL}`,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: 'en',
        publisher: { '@id': `${SITE_URL}#organization` },
      },
      {
        '@type': 'ItemList',
        name: 'Top picks 13 STYLES',
        itemListElement: initialProducts.slice(0, 8).map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Product',
            name: product.name,
            description: product.shortDesc,
            image: product.images?.[0] ? `${SITE_URL}${product.images[0]}` : undefined,
            offers: {
              '@type': 'Offer',
              price: product.price,
              priceCurrency: 'RUB',
              availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            },
          },
        })),
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AppShell initialProducts={initialProducts} initialCategories={initialCategories} />
    </>
  )
}

export default Page
