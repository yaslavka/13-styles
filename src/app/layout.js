import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { SITE_NAME, SITE_URL } from '@/lib/constants'

// SEO-метаданные маркетплейса (по правилам: canonical, OG, Twitter, robots)
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'PIXART MARKET — пиксельный маркетплейс одежды, обуви и аксессуаров 16–50',
    template: '%s — PIXART MARKET',
  },
  description:
    'PIXART MARKET — анимированный маркетплейс стритвир-одежды, обуви и аксессуаров в пиксель-арт стилистике. Мужская и женская одежда, кроссовки, рюкзаки, часы. Для подростков от 16 и взрослых до 50. Доставка 1–3 дня, возврат 14 дней, поддержка 24/7 в чате.',
  keywords: [
    'маркетплейс одежды',
    'купить одежду онлайн',
    'пиксель-арт стиль',
    'стритвир маркетплейс',
    'мужская одежда',
    'женская одежда',
    'кроссовки купить',
    'обувь онлайн',
    'аксессуары купить',
    'рюкзак купить',
    'одежда для подростков',
    'одежда 16 лет',
    'pixart market',
  ],
  authors: [{ name: 'PIXART Team' }],
  creator: 'PIXART',
  publisher: 'PIXART MARKET',
  applicationName: SITE_NAME,
  category: 'shopping',
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'PIXART MARKET — пиксельный маркетплейс одежды 16–50',
    description:
      'Одежда, обувь и аксессуары в пиксель-арт стилистике. 13 фирменных градиентных стилей, анимированные карточки товаров, поддержка в чате 24/7.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PIXART MARKET — пиксельный маркетплейс одежды 16–50',
    description: 'Стритвир, обувь и аксессуары в 8-битной стилистике. Для 16–50 лет.',
  },
  icons: { icon: '/icon.svg' },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#07070f',
}

const RootLayout = ({ children }) => (
  <html lang="ru" className="dark" suppressHydrationWarning>
    <body className="min-h-screen antialiased bg-background text-foreground">
      {children}
      <Toaster />
      <Sonner position="top-center" richColors closeButton />
    </body>
  </html>
)

export default RootLayout
