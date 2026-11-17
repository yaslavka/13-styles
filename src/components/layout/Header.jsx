'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, MessageSquareText, Search, Menu, X, Store, Globe, Check, UserRound, LogOut } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import useShop from '@/store/useShop'
import useCart from '@/store/useCart'
import useAuth from '@/store/useAuth'
import useT from '@/hooks/useT'
import { LOCALES } from '@/lib/i18n'
import GradientText from '@/components/motion/GradientText'

// Шапка 13 STYLES: стеклянный логотип (ведёт на главную), навигация, поиск, язык, аккаунт, корзина

const Header = () => {
  const [search, setSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useShop((state) => state.navigate)
  const setFilter = useShop((state) => state.setFilter)
  const setChatOpen = useShop((state) => state.setChatOpen)
  const locale = useShop((state) => state.locale)
  const setLocale = useShop((state) => state.setLocale)
  const user = useAuth((state) => state.user)
  const setAuthOpen = useAuth((state) => state.setAuthOpen)
  const logout = useAuth((state) => state.logout)
  const cartCount = useCart((state) => state.items.reduce((sum, item) => sum + item.qty, 0))
  const cartOpen = useCart((state) => state.open)
  const t = useT()

  // Кнопка «Главная» в навигации не нужна: логотип уже ведёт на главную
  const navLinks = [
    { key: 'nav.catalog', view: 'catalog' },
    { key: 'nav.men', view: 'catalog', query: { category: 'men' } },
    { key: 'nav.women', view: 'catalog', query: { category: 'women' } },
    { key: 'nav.shoes', view: 'catalog', query: { category: 'shoes' } },
    { key: 'nav.accessories', view: 'catalog', query: { category: 'accessories' } },
    { key: 'nav.styles', view: 'styles' },
  ]

  const currentLocale = LOCALES.find((item) => item.code === locale) || LOCALES[0]

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

  const openAuth = () => {
    setMobileOpen(false)
    setAuthOpen(true)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-purple-400/15 bg-[#08081a]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => go({ view: 'home' })}
          className="flex shrink-0 items-center gap-2.5 focus-visible:outline-none"
          aria-label="13 STYLES — home"
        >
          <span className="glass-btn glass-btn-primary grid h-11 w-11 place-items-center rounded-2xl">
            <Store className="h-5 w-5 text-white" aria-hidden />
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <GradientText as="span" styleIndex={2} className="font-display text-2xl font-extrabold">
              13 STYLES
            </GradientText>
            <span className="font-display text-[11px] font-semibold tracking-[0.22em] text-orange-300/90">
              {t('header.tagline')}
            </span>
          </span>
        </button>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <button
              key={link.key}
              type="button"
              onClick={() => go(link)}
              className="whitespace-nowrap rounded-full px-3.5 py-2 font-display text-[15px] font-semibold text-purple-100/80 transition-all hover:bg-white/10 hover:text-white"
            >
              {t(link.key)}
            </button>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden w-56 xl:block" role="search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-300/60" aria-hidden />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('header.searchPlaceholder')}
              className="h-10 rounded-full border-white/20 bg-white/5 pl-9 text-sm placeholder:text-purple-300/40 backdrop-blur-md"
              aria-label={t('header.search')}
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1.5 xl:ml-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="glass-btn glass-btn-ghost flex h-10 items-center gap-1.5 rounded-full px-3 font-display text-sm text-purple-100"
                aria-label={t('header.language')}
              >
                <Globe className="h-4 w-4 text-orange-300" aria-hidden />
                <span className="hidden md:inline">{currentLocale.code.toUpperCase()}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="max-h-80 w-48 overflow-y-auto rounded-2xl border-white/15 bg-[#161233]/95 p-1.5 backdrop-blur-xl"
            >
              {LOCALES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLocale(item.code)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                    item.code === locale ? 'bg-purple-500/25 text-white' : 'text-purple-100/80 hover:bg-white/10'
                  }`}
                >
                  <span>{item.native}</span>
                  {item.code === locale ? <Check className="h-3.5 w-3.5 text-orange-300" aria-hidden /> : null}
                </button>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="glass-btn glass-btn-primary flex h-10 items-center gap-1.5 rounded-full px-3 font-display text-sm text-white"
                  aria-label={t('auth.account')}
                >
                  <UserRound className="h-4 w-4" aria-hidden />
                  <span className="hidden max-w-24 truncate md:inline">{user.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-white/15 bg-[#161233]/95 p-1.5 backdrop-blur-xl">
                <DropdownMenuItem asChild>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-purple-100/80 transition-colors hover:bg-white/10"
                  >
                    <LogOut className="h-4 w-4 text-orange-300" aria-hidden /> {t('auth.logout')}
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={openAuth}
              aria-label={t('auth.title')}
              className="text-purple-200 hover:bg-white/10 hover:text-white"
            >
              <UserRound className="h-5 w-5" aria-hidden />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChatOpen(true)}
            aria-label={t('header.support')}
            className="text-purple-200 hover:bg-white/10 hover:text-white"
          >
            <MessageSquareText className="h-5 w-5" aria-hidden />
          </Button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={cartOpen}
            className="glass-btn glass-btn-orange relative grid h-11 w-11 place-items-center rounded-full"
            aria-label={`${t('header.cart')}, ${cartCount}`}
          >
            <ShoppingCart className="h-5 w-5 text-white" aria-hidden />
            {cartCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white shadow-lg animate-pop">
                {cartCount}
              </span>
            ) : null}
          </motion.button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t('nav.menu')}>
                {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 border-white/15 bg-[#12102a]/95 backdrop-blur-xl">
              <SheetHeader>
                <SheetTitle className="font-display text-purple-200">13 STYLES</SheetTitle>
              </SheetHeader>
              <form onSubmit={submitSearch} className="px-4" role="search">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('header.searchPlaceholder')}
                  className="rounded-full border-white/20 bg-white/5 text-sm"
                  aria-label={t('header.search')}
                />
              </form>
              <nav className="mt-2 flex flex-col gap-1 px-4" aria-label="Mobile navigation">
                {navLinks.map((link) => (
                  <button
                    key={link.key}
                    type="button"
                    onClick={() => go(link)}
                    className="rounded-2xl px-3 py-2.5 text-left font-display text-lg font-semibold text-purple-100/90 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {t(link.key)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={openAuth}
                  className="glass-btn glass-btn-ghost mt-4 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left font-display text-base text-orange-200"
                >
                  <UserRound className="h-4 w-4" aria-hidden /> {user ? user.name : t('auth.title')}
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
