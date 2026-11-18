import Link from 'next/link'
import GlassButton from '@/components/motion/GlassButton'

// 404: страница не найдена (серверный компонент — без клиентских хуков)

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
}

const NotFound = () => (
  <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-28 text-center">
    <span className="font-display text-6xl font-extrabold text-orange-400/80 animate-blink">404</span>
    <h1 className="font-display text-3xl font-bold text-white">This page slipped out of style</h1>
    <p className="text-sm font-semibold text-muted-foreground">
      The page you are looking for does not exist or has been moved to another collection.
    </p>
    <div className="flex flex-wrap justify-center gap-3">
      <Link href="/">
        <GlassButton tone="primary" className="h-11 px-6">Main page</GlassButton>
      </Link>
      <Link href="/catalog">
        <GlassButton tone="ghost" className="h-11 px-6">Catalog</GlassButton>
      </Link>
    </div>
  </div>
)

export default NotFound
