'use client'

import Hero from '@/components/home/Hero'
import Marquee from '@/components/home/Marquee'
import CategoryCards from '@/components/home/CategoryCards'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import Advantages from '@/components/home/Advantages'
import GlassButton from '@/components/motion/GlassButton'
import GradientText from '@/components/motion/GradientText'
import Reveal from '@/components/motion/Reveal'
import useShop from '@/store/useShop'
import useT from '@/hooks/useT'

// Главная страница: полностью анимированная витрина 13 STYLES

const HomeView = ({ initialProducts, initialCategories }) => {
  const navigate = useShop((state) => state.navigate)
  const t = useT()

  return (
    <>
      <Hero />
      <Marquee />
      <CategoryCards categories={initialCategories} />
      <FeaturedProducts products={initialProducts} />

      <Reveal className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="glow-frame relative overflow-hidden rounded-[2rem] p-10 text-center sm:p-14" style={{ background: 'linear-gradient(120deg, #1a1038, #5b21b6 45%, #ea580c)' }}>
          <span className="animate-gradient-x absolute inset-0 opacity-30" aria-hidden style={{ background: 'linear-gradient(120deg, transparent 25%, #c4b5fd 50%, transparent 75%)', backgroundSize: '220% 220%' }} />
          <div className="relative">
            <h2 className="font-display text-4xl font-extrabold text-white sm:text-5xl">
              <GradientText styleIndex={7}>{t('home.saleTitle')}</GradientText>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base font-semibold text-purple-100/90">{t('home.saleSub')}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <GlassButton tone="orange" className="h-13 px-9 text-lg" onClick={() => navigate('catalog', { query: { discount: '1' } })}>
                {t('home.saleBtn')}
              </GlassButton>
              <GlassButton tone="ghost" className="h-13 px-9 text-lg" onClick={() => navigate('styles')}>
                {t('home.stylesBtn')}
              </GlassButton>
            </div>
          </div>
        </div>
      </Reveal>

      <Advantages />
    </>
  )
}

export default HomeView
