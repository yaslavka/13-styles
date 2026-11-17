'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, MessageSquareText, Shield, Search, Menu, X, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import useShop from '@/store/useShop'
import useCart from '@/store/useCart'
import GradientText from '@/components/motion/GradientText'

// Шапка маркетплейса: логотип, навигация по категориям, поиск, корзина, чат, админка

const NAV_LINKS = [
  { label: 'Главная', view: 'home' },
  { label: 'Каталог', view: 'catalog' },
  { label: 'Мужское', view: 'catalog', query: { category: 'men' } },
  { label: 'Женское', view: 'catalog', query: { category: 'women' } },
  { label: 'Обувь', view: 'catalog', query: { category: 'shoes' } },
  { label: 'Аксессуары', view: 'catalog', query: { category: 'accessories' } },
  { label: '13 стилей', view: 'styles' },
]

const Header = () => {
  const [search, setSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useShop((state) => state.navigate)
  const setFilter = useShop((state) => state.setFilter)
  const setChatOpen = useShop((state) => state.setChatOpen)
  const cartCount = useCart((state) => state.items.reduce((sum, item) => sum + item.qty, 0))
  const cartOpen = useCart((state) => state.open)

  const go = (link) => {
    setMobileOpen(false)
    navigate(link.view, { query: link.query || {} })
  }

  const submitSearch = (event) => {
    event.preventDefault()
    setFilter({ search })
    navigate('catalog', { query: search ? { search } : {} })
    setMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-purple-500/20 bg-[#07070f]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => go({ view: 'home' })}
          className="flex shrink-0 items-center gap-2 focus-visible:outline-none"
          aria-label="PIXART MARKET — на главную"
        >
          <span className="pixel-corners-sm grid h-9 w-9 place-items-center bg-gradient-to-br from-purple-600 via-purple-500 to-orange-500 shadow-[0_0_16px_rgba(139,92,246,0.5)]">
            <Zap className="h-5 w-5 text-white" aria-hidden />
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <GradientText as="span" styleIndex={2} className="font-display text-xl font-bold">
              PIXART
            </GradientText>
            <span className="font-display text-[10px] tracking-[0.3em] text-orange-400">13 STYLES</span>
          </span>
        </button>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Основная навигация">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => go(link)}
              className="pixel-corners-sm px-3 py-2 font-display text-sm text-purple-100/80 transition-colors hover:bg-purple-500/15 hover:text-white"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden w-56 xl:block" role="search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-300/60" aria-hidden />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск товаров…"
              className="h-9 border-purple-500/30 bg-[#0d0c1c] pl-8 text-sm placeholder:text-purple-300/40"
              aria-label="Поиск товаров"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1.5 xl:ml-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChatOpen(true)}
            aria-label="Открыть чат поддержки"
            className="text-purple-200 hover:bg-purple-500/20 hover:text-white"
          >
            <MessageSquareText className="h-5 w-5" aria-hidden />
          </Button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={cartOpen}
            className="pixel-corners-sm relative grid h-10 w-10 place-items-center bg-gradient-to-br from-orange-500 to-purple-600 text-white shadow-[0_0_14px_rgba(249,115,22,0.4)] transition-transform hover:scale-105"
            aria-label={`Корзина, товаров: ${cartCount}`}
          >
            <ShoppingCart className="h-5 w-5" aria-hidden />
            {cartCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white animate-pop">
                {cartCount}
              </span>
            ) : null}
          </motion.button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('admin')}
            aria-label="Админ-панель"
            className="hidden text-purple-200 hover:bg-purple-500/20 hover:text-white sm:grid"
          >
            <Shield className="h-5 w-5" aria-hidden />
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Меню">
                {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-purple-500/30 bg-[#0a0918]">
              <SheetHeader>
                <SheetTitle className="font-display text-purple-200">PIXART MARKET</SheetTitle>
              </SheetHeader>
              <form onSubmit={submitSearch} className="px-4" role="search">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Поиск товаров…"
                  className="border-purple-500/30 bg-[#0d0c1c] text-sm"
                  aria-label="Поиск товаров"
                />
              </form>
              <nav className="mt-2 flex flex-col gap-1 px-4" aria-label="Мобильная навигация">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => go(link)}
                    className="pixel-corners-sm px-3 py-2.5 text-left font-display text-base text-purple-100/90 transition-colors hover:bg-purple-500/15 hover:text-white"
                  >
                    {link.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false)
                    navigate('admin')
                  }}
                  className="pixel-corners-sm mt-4 flex items-center gap-2 px-3 py-2.5 text-left font-display text-base text-orange-300 hover:bg-orange-500/10"
                >
                  <Shield className="h-4 w-4" aria-hidden /> Админ-панель
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

export default Header
