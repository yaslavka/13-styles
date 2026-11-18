import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import AppShell from '@/components/layout/AppShell'

// Корневой layout 13 STYLES: SEO-метаданные витрины (английские — базовый язык
// витрины; админ-панель на русском) + клиентская оболочка AppShell.

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '13 STYLES — cartoon-real marketplace for clothing, shoes & accessories',
    template: '%s — 13 STYLES',
  },
  description:
    '13 STYLES is a cartoon-real marketplace for streetwear clothing, sneakers and accessories. Glossy animated storefront, 13 signature gradient styles, delivery across Europe in 1–3 days, 14-day returns and 24/7 human support. For teens from 16 and adults up to 50.',
  keywords: [
    'clothing marketplace',
    'buy clothes online Europe',
    'cartoon style streetwear',
    'sneakers marketplace',
    "men's clothing",
    "women's clothing",
    'buy sneakers',
    'shoes online shop',
    'buy accessories',
    'backpack shop',
    'clothing for teens 16',
    'streetwear for adults',
    '13 styles',
  ],
  authors: [{ name: '13 STYLES Team' }],
  creator: '13 STYLES',
  publisher: '13 STYLES',
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
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: '13 STYLES — cartoon-real marketplace for clothing 16–50',
    description:
      'Streetwear, sneakers and accessories rendered in a cartoon-real look. 13 signature gradient styles, sliding product cards, 24/7 support chat.',
  },
  twitter: {
    card: 'summary_large_image',
    title: '13 STYLES — cartoon-real marketplace for clothing 16–50',
    description: 'Streetwear, sneakers and accessories in a glossy cartoon-real look. For 16–50.',
  },
  icons: { icon: '/icon.svg' },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#08081a',
}

const RootLayout = ({ children }) => (
  <html lang="en" className="dark" suppressHydrationWarning>
    <body className="min-h-screen antialiased bg-background text-foreground">
      <AppShell>{children}</AppShell>
      <Toaster />
      <Sonner position="top-center" richColors closeButton />
    </body>
  </html>
)

export default RootLayout
