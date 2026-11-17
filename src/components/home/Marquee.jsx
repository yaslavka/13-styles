'use client'

// Бегущая строка акций в пиксельной стилистике

const ITEMS = [
  'СКИДКИ ДО 30%',
  'НОВАЯ КОЛЛЕКЦИЯ NEO',
  'ДОСТАВКА 1–3 ДНЯ',
  'ВОЗВРАТ 14 ДНЕЙ',
  'ПОДДЕРЖКА 24/7',
  'ОБМЕН БЕЗ ПРОБЛЕМ',
  'ТОЛЬКО 16–50',
]

const Marquee = () => {
  const track = [...ITEMS, ...ITEMS]
  return (
    <div className="relative overflow-hidden border-y border-purple-500/25 bg-gradient-to-r from-purple-950/60 via-[#0d0c1c] to-orange-950/50 py-3" aria-hidden>
      <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap px-4">
        {track.map((item, index) => (
          <span key={`${item}-${index}`} className="flex items-center gap-8 font-display text-sm tracking-wide">
            <span className={index % 2 ? 'text-orange-300' : 'text-purple-200'}>{item}</span>
            <span className="text-purple-500 animate-blink">▞</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default Marquee
