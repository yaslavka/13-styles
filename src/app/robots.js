import { SITE_URL } from '@/lib/constants'

// robots.txt 13 STYLES: открываем витрину (главная, каталог, товары, стили),
// закрываем служебные зоны (админка, API, личный кабинет, оформление заказа).
// Отдельный явный блок для googlebot + sitemap и host для поисковых систем.

const CRAWL_RULES = {
  allow: ['/', '/catalog*', '/product*', '/styles'],
  disallow: ['/admin', '/admin/', '/api/', '/account', '/checkout'],
}

const robots = () => ({
  rules: [
    { userAgent: '*', ...CRAWL_RULES },
    { userAgent: 'googlebot', ...CRAWL_RULES },
  ],
  sitemap: `${SITE_URL}/sitemap.xml`,
  host: SITE_URL,
})

export default robots
