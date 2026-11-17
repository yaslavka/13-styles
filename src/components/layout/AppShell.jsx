'use client'

import { useEffect, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useShop from '@/store/useShop'
import PixelBackground from '@/components/layout/PixelBackground'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartSheet from '@/components/cart/CartSheet'
import ChatWidget from '@/components/chat/ChatWidget'
import HomeView from '@/components/home/HomeView'
import CatalogView from '@/components/catalog/CatalogView'
import ProductView from '@/components/product/ProductView'
import CheckoutView from '@/components/cart/CheckoutView'
import StylesView from '@/components/styles/StylesView'
import AdminView from '@/components/admin/AdminView'

// Оболочка приложения: SPA-маршрутизация по хэшу внутри единственного маршрута /
// Header + анимированные переходы видов + прижатый футер (min-h-screen flex + mt-auto)

const AppShell = ({ initialProducts = [], initialCategories = [] }) => {
  const route = useShop((state) => state.route)
  const accentStyle = useShop((state) => state.accentStyle)
  const syncRoute = useShop((state) => state.syncRoute)

  useEffect(() => {
    syncRoute()
    const onHashChange = () => syncRoute()
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [syncRoute])

  const renderView = () => {
    switch (route.view) {
      case 'catalog':
        return <CatalogView categories={initialCategories} />
      case 'product':
        return <ProductView />
      case 'checkout':
        return <CheckoutView />
      case 'styles':
        return <StylesView />
      case 'admin':
        return <AdminView />
      default:
        return <HomeView initialProducts={initialProducts} initialCategories={initialCategories} />
    }
  }

  const transitionKey = route.view === 'product' ? `product-${route.slug}` : route.view

  // Сброс скролла при переходе между видами
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [transitionKey])

  return (
    <div className="relative flex min-h-screen flex-col">
      <PixelBackground />
      <Header />
      <main className="flex-1" id="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={transitionKey}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <Suspense>
              {renderView()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <CartSheet />
      <ChatWidget />
    </div>
  )
}

export default AppShell
