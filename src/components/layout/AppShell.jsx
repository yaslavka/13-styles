'use client'

import { useEffect } from 'react'
import AnimatedBackground from '@/components/layout/AnimatedBackground'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartSheet from '@/components/cart/CartSheet'
import ChatWidget from '@/components/chat/ChatWidget'
import UserAuthDialog from '@/components/auth/UserAuthDialog'
import useShop from '@/store/useShop'
import useCart from '@/store/useCart'
import useAuth from '@/store/useAuth'
import { usePathname } from 'next/navigation'

// Оболочка приложения (клиентская): шапка, анимированный фон, прижатый футер,
// глобальные оверлеи (корзина, чат, авторизация). Сами виды рендерятся
// реальными маршрутами App Router и приходят как children.

const AppShell = ({ children }) => {
  const attachRouter = useShop((state) => state.attachRouter)
  const initLocale = useShop((state) => state.initLocale)
  const pathname = usePathname()

  useEffect(() => {
    // Отложенная регидратация персист-состояний: первый рендер совпадает с SSR,
    // сохранённые фильтры/язык/корзина подхватываются сразу после монтирования
    useShop.persist.rehydrate()
    useCart.persist.rehydrate()
    useAuth.persist.rehydrate()
    useAuth.getState().init()
    initLocale()
  }, [initLocale])

  return (
    <div className="relative flex min-h-screen flex-col">
      <AnimatedBackground />
      <Header />
      <main className="flex-1" id="main-content">
        {children}
      </main>
      <Footer />
      <CartSheet />
      <ChatWidget />
      <UserAuthDialog />
      {/* Скрытый маркер маршрута для e2e-проверок и скролла наверх при смене страницы */}
      <span className="sr-only" data-testid="current-path" aria-hidden>{pathname}</span>
    </div>
  )
}

export default AppShell
