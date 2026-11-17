'use client'

import { Truck, RotateCcw, ShieldCheck, MessageCircle } from 'lucide-react'
import GlassCard from '@/components/motion/GlassCard'
import Reveal from '@/components/motion/Reveal'
import useT from '@/hooks/useT'

// Преимущества магазина на стеклянных карточках

const Advantages = () => {
  const t = useT()

  const advantages = [
    {
      icon: Truck,
      title: t('adv.deliveryTitle'),
      text: t('adv.deliveryText'),
      color: '#8b5cf6',
    },
    {
      icon: RotateCcw,
      title: t('adv.returnTitle'),
      text: t('adv.returnText'),
      color: '#f97316',
    },
    {
      icon: ShieldCheck,
      title: t('adv.paymentTitle'),
      text: t('adv.paymentText'),
      color: '#3b82f6',
    },
    {
      icon: MessageCircle,
      title: t('adv.supportTitle'),
      text: t('adv.supportText'),
      color: '#c4b5fd',
    },
  ]

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6" aria-label="Store advantages">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {advantages.map((item, index) => (
          <Reveal key={item.title} delay={index * 0.07}>
            <GlassCard glowColor={item.color} className="h-full p-6">
              <span
                className="grid h-13 w-13 place-items-center rounded-2xl p-3"
                style={{ background: `linear-gradient(140deg, ${item.color}66, ${item.color}22)` }}
              >
                <item.icon className="h-6 w-6" style={{ color: item.color }} aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-xl font-bold text-white">{item.title}</h3>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-muted-foreground">{item.text}</p>
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export default Advantages
