'use client'

import { MessageCircle, Truck, RotateCcw, ShieldCheck, Zap, Heart } from 'lucide-react'
import useShop from '@/store/useShop'
import GradientText from '@/components/motion/GradientText'

// Подвал: прижат к низу (mt-auto), навигация, инфо, возрастная метка

const Footer = () => {
  const navigate = useShop((state) => state.navigate)
  const setChatOpen = useShop((state) => state.setChatOpen)

  const columns = [
    {
      title: 'Каталог',
      links: [
        { label: 'Мужская одежда', action: () => navigate('catalog', { query: { category: 'men' } }) },
        { label: 'Женская одежда', action: () => navigate('catalog', { query: { category: 'women' } }) },
        { label: 'Обувь', action: () => navigate('catalog', { query: { category: 'shoes' } }) },
        { label: 'Аксессуары', action: () => navigate('catalog', { query: { category: 'accessories' } }) },
      ],
    },
    {
      title: 'Магазин',
      links: [
        { label: '13 стилей', action: () => navigate('styles') },
        { label: 'Хиты продаж', action: () => navigate('catalog') },
        { label: 'Админ-панель', action: () => navigate('admin') },
      ],
    },
    {
      title: 'Помощь',
      links: [
        { label: 'Чат поддержки', action: () => setChatOpen(true) },
        { label: 'Доставка и оплата', action: () => setChatOpen(true) },
        { label: 'Возврат 14 дней', action: () => setChatOpen(true) },
      ],
    },
  ]

  const advantages = [
    { icon: Truck, text: 'Доставка 1–3 дня' },
    { icon: RotateCcw, text: 'Возврат 14 дней' },
    { icon: ShieldCheck, text: 'Безопасная оплата' },
    { icon: MessageCircle, text: 'Поддержка 24/7' },
  ]

  return (
    <footer className="mt-auto border-t border-purple-500/20 bg-[#06060d]/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="pixel-corners-sm grid h-8 w-8 place-items-center bg-gradient-to-br from-purple-600 to-orange-500">
                <Zap className="h-4 w-4 text-white" aria-hidden />
              </span>
              <GradientText as="span" styleIndex={2} className="font-display text-lg font-bold">
                PIXART MARKET
              </GradientText>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Пиксельный маркетплейс одежды, обуви и аксессуаров для подростков от 16 и взрослых до 50.
              Полностью анимированные страницы, 13 фирменных градиентных стилей.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {advantages.map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="pixel-corners-sm inline-flex items-center gap-1.5 border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs text-purple-200"
                >
                  <Icon className="h-3.5 w-3.5 text-orange-400" aria-hidden />
                  {text}
                </span>
              ))}
            </div>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="font-display text-sm uppercase tracking-wider text-purple-300">{column.title}</h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <button
                      type="button"
                      onClick={link.action}
                      className="text-sm text-muted-foreground transition-colors hover:text-orange-300"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-purple-500/15 pt-5 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} PIXART MARKET — сделано с
            <Heart className="mx-1 inline h-3 w-3 text-orange-500" aria-hidden />
            на Next.js + socket.io
          </p>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="pixel-corners-sm border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 font-display text-orange-300">
              16+
            </span>
            Одежда и обувь для 16–50 лет
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
