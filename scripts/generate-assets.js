// Генератор пиксель-арт SVG ассетов товаров PIXART MARKET
// Запуск: bun scripts/generate-assets.js
// Создаёт public/products/<спрайт>-<цветовая схема>-<вариант>.svg

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const OUT_DIR = join(process.cwd(), 'public', 'products')
const GRID = 16
const VIEW = 256

// Палитра спрайтов: контур + нейтрали (остальное подставляется из цветовой схемы)
const BASE_COLORS = {
  o: '#0b0b14', // контур
  w: '#f8fafc', // белый
  g: '#cbd5e1', // светло-серый
  k: '#221d33', // тёмный (внутренности, экраны, подошва)
}

// 5 цветовых схем в гамме бренда: чёрный/синий/фиолетовый/светло-фиолетовый/оранжевый/светло-оранжевый
const COLORWAYS = {
  violet: { p: '#8b5cf6', d: '#5b21b6', l: '#c4b5fd', s: '#f97316', t: '#c2410c', style: 3 },
  orange: { p: '#f97316', d: '#c2410c', l: '#fdba74', s: '#8b5cf6', t: '#6d28d9', style: 7 },
  blue: { p: '#3b82f6', d: '#1d4ed8', l: '#93c5fd', s: '#f97316', t: '#c2410c', style: 9 },
  lilac: { p: '#c4b5fd', d: '#8b5cf6', l: '#ede9fe', s: '#f97316', t: '#ea580c', style: 8 },
  night: { p: '#3b3555', d: '#221d33', l: '#6d5fa8', s: '#f97316', t: '#c2410c', style: 0 },
}

const STYLES_BG = [
  ['#141126', '#7c3aed', '#141126'], ['#0a1230', '#2563eb', '#0a1230'], ['#1d1030', '#8b5cf6', '#f97316'],
  ['#170b2e', '#8b5cf6', '#c4b5fd'], ['#230f08', '#f97316', '#8b5cf6'], ['#05050f', '#1d4ed8', '#05050f'],
  ['#1c1134', '#a78bfa', '#2563eb'], ['#240d05', '#f97316', '#fdba74'], ['#100a24', '#c4b5fd', '#8b5cf6'],
  ['#081226', '#3b82f6', '#a78bfa'], ['#1e0e06', '#fdba74', '#f97316'], ['#0b0b18', '#6d28d9', '#3b82f6'],
  ['#1f0d16', '#fed7aa', '#8b5cf6'],
]

const STYLE_ACCENTS = ['#a78bfa', '#60a5fa', '#fdba74', '#c4b5fd', '#f97316', '#3b82f6', '#a78bfa', '#fdba74', '#ddd6fe', '#93c5fd', '#fed7aa', '#a78bfa', '#fed7aa']

// Симетричные спрайты задаются левой половиной (8 символов), правая зеркалится
// Легенда: . пусто | o контур | p основной | d тёмный | l светлый | s акцент | t тёмный акцент | w белый | g серый | k тёмно-серый
const HALF_SPRITES = {
  hoodie: [
    '........',
    '...ooooo',
    '..oppppp',
    '.oppdddd',
    '.opdkkkk',
    '..pdkkkk',
    'ooppopdd',
    'oppopwpp',
    'oppopppp',
    'oppopppp',
    'oppopopp',
    'oppopppp',
    'oppopppp',
    '.oppoppp',
    '..oppppp',
    '...ooooo',
  ],
  tshirt: [
    '........',
    '........',
    '.....ooo',
    '....okkk',
    'oppooooo',
    'oppopppp',
    'oppopppp',
    '.opppppp',
    '.oppppss',
    '.oppppss',
    '.oppppss',
    '.oppppss',
    '.opppppp',
    '.opppppp',
    '.opppppp',
    '..oooooo',
  ],
  jacket: [
    '........',
    '...ooooo',
    '..oddpdd',
    '.opppppp',
    'oppoppoo',
    'oppoppoo',
    'oppoppoo',
    'oppoppoo',
    'oppoppoo',
    'oppoppoo',
    'oppoppoo',
    'oppoppoo',
    '.opoppoo',
    '..oddddd',
    '..oddddd',
    '...ooooo',
  ],
  pants: [
    '........',
    '........',
    '....oooo',
    '...opppp',
    '...opppp',
    '...opppp',
    '..oppo..',
    '..oppo..',
    '..opdpo.',
    '..oppo..',
    '..oppo..',
    '..oppo..',
    '..oppo..',
    '..oppo..',
    '..oppo..',
    '..ooooo.',
  ],
  dress: [
    '........',
    '.....ooo',
    '....okkk',
    '.oppoooo',
    '.opppppp',
    '.opppppp',
    '.opppppp',
    '.opppppp',
    '.opppsss',
    '..oppppp',
    '..oppppp',
    '.opppppp',
    '.opppppp',
    'oppppppp',
    'oppppppp',
    'oooooooo',
  ],
  cap: [
    '........',
    '........',
    '.......o',
    '...ooooo',
    '..oppppp',
    '..opplpp',
    '..oppsss',
    '..oppsss',
    '..oppppp',
    '.ooooooo',
    '.opppppp',
    '.opppppp',
    '.ooooooo',
    '........',
    '........',
    '........',
  ],
  backpack: [
    '........',
    '......oo',
    '.....o..',
    '..oooooo',
    '..oppppp',
    '..oppppp',
    '..oppppp',
    '..oooooo',
    '..oppppp',
    '..oppooo',
    '..oppopp',
    '..oppopp',
    '..oppopp',
    '..oppooo',
    '..oppppp',
    '..oooooo',
  ],
  watch: [
    '......oo',
    '......op',
    '......op',
    '......op',
    '....oooo',
    '...opkkk',
    '...opkww',
    '...opkkw',
    '...opkkk',
    '....oooo',
    '......op',
    '......op',
    '......ok',
    '......op',
    '......oo',
    '........',
  ],
}

// Асимметричные спрайты задаются полными строками (16 символов)
const FULL_SPRITES = {
  sneaker: [
    '................',
    '................',
    '................',
    '...ooo.....ooooo',
    '..opppo...oppppo',
    '..oppppo..oppppo',
    '..oppppwwwpppppo',
    '..oppppwwpppppo.',
    '..opppppppppppo.',
    '..opsssspppppo..',
    '..oppppppppppo..',
    '..oppppppppppo..',
    '.owwwwwwwwwwwwo.',
    '.okkkkkkkkkkkko.',
    '.okkkkkkkkkkkko.',
    '..oooooooooooo..',
  ],
  boot: [
    '................',
    '................',
    '...oooooo.......',
    '...oppppo.......',
    '...opwppo.......',
    '...oppppo.......',
    '...opppppoo.....',
    '..opppppppppo...',
    '..oppppppppppo..',
    '..opsspppppppo..',
    '..oppppppppppo..',
    '.owwwwwwwwwwwwo.',
    '.okkkkkkkkkkkko.',
    '.okkkkkkkkkkkko.',
    '..oooooooooooo..',
    '................',
  ],
  sunglasses: [
    '................',
    '................',
    '................',
    '................',
    '.oooooooooooooo.',
    '.okkkkkoookkkko.',
    '.olkkkkoookkklo.',
    '.okkkkkoookkkko.',
    '.oooooooooooooo.',
    '.oo..........oo.',
    '.o............o.',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
}

// Разворот половины в полную строку с зеркалом
const mirrorRow = (half) => half + half.split('').reverse().join('')

// Сборка карты спрайта 16x16 с валидацией
const buildSpriteMap = (rows) => {
  if (rows.length !== GRID) throw new Error(`Спрайт: ожидается ${GRID} строк, получено ${rows.length}`)
  return rows.map((row, index) => {
    if (row.length !== GRID) throw new Error(`Спрайт строка ${index}: ожидается ${GRID} символов, получено ${row.length} → "${row}"`)
    return row
  })
}

const SPRITES = Object.fromEntries([
  ...Object.entries(HALF_SPRITES).map(([name, halves]) => [name, buildSpriteMap(halves.map(mirrorRow))]),
  ...Object.entries(FULL_SPRITES).map(([name, rows]) => [name, buildSpriteMap(rows)]),
])

// Детерминированный псевдослучайный генератор для декоративных пикселей
const makeRng = (seed) => {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const hashString = (text) => {
  let hash = 2166136261
  for (const ch of text) {
    hash ^= ch.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const escapeXml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Сборка SVG одного изображения товара
const buildSvg = ({ spriteName, colorwayName, variant }) => {
  const rows = SPRITES[spriteName]
  const colorway = COLORWAYS[colorwayName]
  const colors = { ...BASE_COLORS, p: colorway.p, d: colorway.d, l: colorway.l, s: colorway.s, t: colorway.t }

  const baseStyle = colorway.style
  const styleIndex = (baseStyle + [0, 2, 5][variant] ) % STYLES_BG.length
  const [c0, c1, c2] = STYLES_BG[styleIndex]
  const accent = STYLE_ACCENTS[styleIndex]

  const scale = variant === 1 ? 9 : 10
  const spriteSize = GRID * scale
  const offsetX = Math.round((VIEW - spriteSize) / 2)
  const offsetY = variant === 1 ? 54 : 44
  const flip = variant === 2

  const rng = makeRng(hashString(`${spriteName}:${colorwayName}:${variant}`))
  const decoPixels = Array.from({ length: 7 }, () => {
    const x = Math.round(16 + rng() * (VIEW - 44))
    const y = Math.round(16 + rng() * (VIEW - 44))
    const size = rng() > 0.6 ? 8 : 5
    const fill = [accent, c1, colorway.p, colorway.l][Math.floor(rng() * 4)]
    const opacity = (0.25 + rng() * 0.5).toFixed(2)
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${fill}" opacity="${opacity}"/>`
  }).join('')

  const shadowRects = []
  const pixelRects = []
  rows.forEach((row, y) => {
    row.split('').forEach((ch, x) => {
      if (ch === '.' || !colors[ch]) return
      const px = x * scale
      const py = y * scale
      shadowRects.push(`<rect x="${px + 4}" y="${py + 5}" width="${scale}" height="${scale}" fill="#05050c"/>`)
      pixelRects.push(`<rect x="${px}" y="${py}" width="${scale}" height="${scale}" fill="${colors[ch]}"/>`)
    })
  })

  const spriteTransform = flip
    ? `translate(${offsetX + spriteSize}, ${offsetY}) scale(-1, 1)`
    : `translate(${offsetX}, ${offsetY})`

  const shadowY = offsetY + spriteSize + 10
  const shadowWidth = Math.round(spriteSize * 0.72)
  const shadowX = Math.round((VIEW - shadowWidth) / 2)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW} ${VIEW}" width="512" height="512" shape-rendering="crispEdges">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="0.55" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
<radialGradient id="glow" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stop-color="${accent}" stop-opacity="0.4"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
<pattern id="grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/></pattern>
</defs>
<rect width="${VIEW}" height="${VIEW}" fill="url(#bg)"/>
<rect width="${VIEW}" height="${VIEW}" fill="url(#grid)"/>
<circle cx="128" cy="116" r="92" fill="url(#glow)"/>
${decoPixels}
<rect x="14" y="14" width="12" height="12" fill="${accent}"/>
<rect x="230" y="14" width="12" height="12" fill="${c1}"/>
<rect x="14" y="230" width="12" height="12" fill="${c2}"/>
<rect x="230" y="230" width="12" height="12" fill="${accent}"/>
<rect x="${shadowX}" y="${shadowY}" width="${shadowWidth}" height="8" fill="rgba(4,4,10,0.55)"/>
<rect x="${shadowX + 14}" y="${shadowY + 8}" width="${shadowWidth - 28}" height="5" fill="rgba(4,4,10,0.35)"/>
<g transform="${spriteTransform}"><g opacity="0.42">${shadowRects.join('')}</g>${pixelRects.join('')}</g>
</svg>`
}

const main = () => {
  mkdirSync(OUT_DIR, { recursive: true })
  let count = 0
  for (const spriteName of Object.keys(SPRITES)) {
    for (const colorwayName of Object.keys(COLORWAYS)) {
      for (let variant = 0; variant < 3; variant += 1) {
        const svg = buildSvg({ spriteName, colorwayName, variant })
        const file = join(OUT_DIR, `${spriteName}-${colorwayName}-${variant + 1}.svg`)
        writeFileSync(file, svg, 'utf8')
        count += 1
      }
    }
  }
  console.log(`[assets] сгенерировано ${count} SVG файлов в ${OUT_DIR}`)
}

main()
