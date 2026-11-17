'use client'

import { Truck, RotateCcw, ShieldCheck, MessageCircle } from 'lucide-react'
import ShineCard from '@/components/motion/ShineCard'
import Reveal from '@/components/motion/Reveal'

// Преимущества магазина на анимированных карточках

const ADVANTAGES = [
  {
    icon: Truck,
    title: 'Доставка 1–3 дня',
    text: 'Курьером или в пункт выдачи. Отслеживание в чате поддержки в реальном времени.',
    color: '#8b5cf6',
  },
  {
    icon: RotateCcw,
    title: 'Возврат 14 дней',
    text: 'Не подошёл размер — вернём деньги без вопросов. Обмен на другой размер за наш счёт.',
    color: '#f97316',
  },
  {
    icon: ShieldCheck,
    title: 'Безопасная оплата',
    text: 'Картой, СБП или при получении. Данные защищены, чеки приходят на почту.',
    color: '#3b82f6',
  },
  {
    icon: MessageCircle,
    title: 'Поддержка 24/7',
    text: 'Живые люди в пиксельном чате отвечают круглосуточно — даже в 3 часа ночи.',
    color: '#c4b5fd',
  },
]

const Advantages = () => (
  <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6" aria-label="Преимущества магазина">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ADVANTAGES.map((item, index) => (
        <Reveal key={item.title} delay={index * 0.07}>
          <ShineCard glowColor={item.color} className="h-full p-5">
            <span
              className="pixel-corners-sm grid h-11 w-11 place-items-center"
              style={{ background: `linear-gradient(135deg, ${item.color}55, ${item.color}22)` }}
            >
              <item.icon className="h-5 w-5" style={{ color: item.color }} aria-hidden />
            </span>
            <h3 className="mt-4 font-display text-lg text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
          </ShineCard>
        </Reveal>
      ))}
    </div>
  </section>
)

export default Advantages
