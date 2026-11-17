'use client'

import useT from '@/hooks/useT'

// Бегущая строка акций — стеклянная лента

const Marquee = () => {
  const t = useT()
  const items = [1, 2, 3, 4, 5, 6, 7].map((n) => t(`marquee.${n}`))
  const track = [...items, ...items]

  return (
    <div
      className="relative overflow-hidden border-y border-purple-400/15 bg-gradient-to-r from-purple-950/50 via-[#12102a]/60 to-orange-950/40 py-3.5 backdrop-blur-md"
      aria-hidden
    >
      <div className="marquee-track flex w-max items-center gap-10 whitespace-nowrap px-4">
        {track.map((item, index) => (
          <span key={`${item}-${index}`} className="flex items-center gap-10 font-display text-sm font-bold tracking-wide">
            <span className={index % 2 ? 'text-orange-300' : 'text-purple-200'}>{item}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-blink" />
          </span>
        ))}
      </div>
    </div>
  )
}

export default Marquee
