'use client'

import { MessageCircle, Truck, RotateCcw, ShieldCheck, Store } from 'lucide-react'
import useShop from '@/store/useShop'
import useT from '@/hooks/useT'
import GradientText from '@/components/motion/GradientText'

// Подвал: прижат к низу (mt-auto), без технической информации о начинке сайта

const Footer = () => {
  const navigate = useShop((state) => state.navigate)
  const setChatOpen = useShop((state) => state.setChatOpen)
  const locale = useShop((state) => state.locale)
  const t = useT()

  const columns = [
    {
      title: t('footer.catalog'),
      links: [
        { label: t('footer.men'), action: () => navigate('category', { slug: 'men' }) },
        { label: t('footer.women'), action: () => navigate('category', { slug: 'women' }) },
        { label: t('footer.shoes'), action: () => navigate('category', { slug: 'shoes' }) },
        { label: t('footer.accessories'), action: () => navigate('category', { slug: 'accessories' }) },
      ],
    },
    {
      title: t('footer.shop'),
      links: [
        { label: t('footer.styles'), action: () => navigate('styles') },
        { label: t('footer.hits'), action: () => navigate('catalog') },
      ],
    },
    {
      title: t('footer.help'),
      links: [
        { label: t('footer.chat'), action: () => setChatOpen(true) },
        { label: t('footer.shipping'), action: () => setChatOpen(true) },
        { label: t('footer.returns'), action: () => setChatOpen(true) },
      ],
    },
  ]

  const advantages = [
    { icon: Truck, text: t('adv.deliveryTitle') },
    { icon: RotateCcw, text: t('adv.returnTitle') },
    { icon: ShieldCheck, text: t('adv.paymentTitle') },
    { icon: MessageCircle, text: t('adv.supportTitle') },
  ]

  return (
    <footer className="mt-auto border-t border-purple-400/15 bg-[#070614]/85 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.35fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="glass-btn glass-btn-primary grid h-10 w-10 place-items-center rounded-2xl">
                <Store className="h-4.5 w-4.5 text-white" aria-hidden />
              </span>
              <GradientText as="span" styleIndex={2} className="font-display text-xl font-extrabold">
                13 STYLES
              </GradientText>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{t('footer.about')}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {advantages.map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="glass-btn glass-btn-ghost inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-purple-200"
                >
                  <Icon className="h-3.5 w-3.5 text-orange-300" aria-hidden />
                  {text}
                </span>
              ))}
            </div>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-purple-300">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
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

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-purple-400/10 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">{t('footer.rights', { year: new Date().getFullYear() })}</p>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-orange-400/40 bg-orange-500/10 px-2.5 py-0.5 font-display font-semibold text-orange-300">
              16+
            </span>
            {t('footer.audience')}
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
