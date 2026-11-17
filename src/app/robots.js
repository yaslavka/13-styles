import { SITE_URL } from '@/lib/constants'

// robots.txt для поисковых систем
const robots = () => ({
  rules: {
    userAgent: '*',
    allow: '/',
    disallow: ['/api/'],
  },
  sitemap: `${SITE_URL}/sitemap.xml`,
})

export default robots
