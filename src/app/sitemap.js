import { SITE_URL } from '@/lib/constants'

// sitemap.xml — единственный пользовательский маршрут (SPA-витрина)
const sitemap = () => [
  {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1,
  },
]

export default sitemap
