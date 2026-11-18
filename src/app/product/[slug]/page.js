import { notFound } from 'next/navigation'
import CATALOG_SERVER from '@/lib/catalog-server'
import { SITE_URL } from '@/lib/constants'
import ProductView from '@/components/product/ProductView'

// Страница товара /product/[slug]: SSR-данные, SEO-метаданные, JSON-LD Product.
// Поддерживает и числовой id: /product/123.

export const revalidate = 60

const loadData = async (slugParam) => {
  const decoded = decodeURIComponent(slugParam)
  try {
    return await CATALOG_SERVER.getProductBySlug(decoded)
  } catch (error) {
    console.error('[product] ошибка загрузки товара:', error?.message || error)
    return null
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const data = await loadData(slug)
  if (!data?.product) return { title: 'Product not found' }

  const product = data.product
  const title = product.name
  const description = (product.shortDesc || product.description || '').slice(0, 300)
  const image = product.images?.[0] ? `${SITE_URL}${product.images[0]}` : undefined

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${SITE_URL}/product/${product.slug}`,
      images: image ? [{ url: image, width: 640, height: 640, alt: product.name }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
  }
}

const ProductPage = async ({ params }) => {
  const { slug } = await params
  const data = await loadData(slug)
  if (!data?.product) notFound()

  const { product, related } = data
  const productUrl = `${SITE_URL}/product/${product.slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDesc || product.description,
    sku: product.slug,
    image: (product.images || []).map((src) => `${SITE_URL}${src}`),
    brand: { '@type': 'Brand', name: '13 STYLES' },
    category: [product.category?.name, product.subcategory?.name].filter(Boolean).join(' > '),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: Math.max(product.reviews, 1),
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      price: product.price,
      priceCurrency: 'EUR',
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '13 STYLES', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: product.category?.name || 'Catalog', item: `${SITE_URL}/catalog/category/${product.category?.slug}` },
      ...(product.subcategory
        ? [{ '@type': 'ListItem', position: 3, name: product.subcategory.name, item: `${SITE_URL}/catalog/category/${product.category?.slug}/${product.subcategory.slug}` }]
        : []),
      { '@type': 'ListItem', position: product.subcategory ? 4 : 3, name: product.name, item: productUrl },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ProductView product={product} related={related} />
    </>
  )
}

export default ProductPage
