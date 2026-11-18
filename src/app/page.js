import CATALOG_SERVER from '@/lib/catalog-server'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import HomeView from '@/components/home/HomeView'

// Главная страница 13 STYLES: все категории товаров, по 8 товаров в каждой.
// SSR-данные для SEO + JSON-LD структурированные данные.

export const revalidate = 60

const Page = async () => {
  let sections = []
  let categories = []

  try {
    sections = await CATALOG_SERVER.getCategorySections(8)
    categories = sections.map((section) => section.category)
  } catch (error) {
    console.error('[page] БД недоступна, показываем витрину без данных:', error?.message || error)
  }

  const featured = sections
    .flatMap((section) => section.products.map((product) => ({ ...product, categoryName: section.category.name })))
    .sort((a, b) => (b.featured === true) - (a.featured === true) || b.rating - a.rating)
    .slice(0, 8)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        description: 'A cartoon-real marketplace for clothing, shoes and accessories for ages 16–50.',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: 'en',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/catalog?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
        publisher: { '@id': `${SITE_URL}#organization` },
      },
      {
        '@type': 'ItemList',
        name: `Top picks ${SITE_NAME}`,
        itemListElement: featured.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${SITE_URL}/product/${product.slug}`,
          item: {
            '@type': 'Product',
            name: product.name,
            description: product.shortDesc,
            image: product.images?.[0] ? `${SITE_URL}${product.images[0]}` : undefined,
            offers: {
              '@type': 'Offer',
              price: product.price,
              priceCurrency: 'EUR',
              availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            },
          },
        })),
      },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeView sections={sections} categories={categories} />
    </>
  )
}

export default Page
