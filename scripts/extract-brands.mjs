// Извлечение реального бренда из названия товара.
// В датасете Garments2Look отдельного поля бренда нет, но у Mytheresa и Polyvore
// бренд почти всегда стоит в названии: "Baby Burberry Check bib", "Givenchy Antigona...".
// Скрипт ищет бренд по базе дизайнеров (word-boundary, без учёта регистра и диакритики)
// и записывает его в Product.brand. Повторный запуск безопасен (обновляет только пустые).
// Запуск: node scripts/extract-brands.mjs

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// match — вариант написания в названии (нижний регистр, ascii), brand — каноническое имя
const BRANDS = [
  ['saint laurent', 'Saint Laurent'], ['yves saint laurent', 'Saint Laurent'],
  ['bottega veneta', 'Bottega Veneta'], ['dries van noten', 'Dries Van Noten'],
  ['maison margiela', 'Maison Margiela'], ['maison kitsune', 'Maison Kitsuné'],
  ['comme des garcons', 'Comme des Garçons'], ['comme des garçons', 'Comme des Garçons'],
  ['isabel marant', 'Isabel Marant'], ['vivienne westwood', 'Vivienne Westwood'],
  ['brunello cucinelli', 'Brunello Cucinelli'], ['ermanno scervino', 'Ermanno Scervino'],
  ['stella mccartney', 'Stella McCartney'], ['dolce & gabbana', 'Dolce & Gabbana'],
  ['dolce and gabbana', 'Dolce & Gabbana'], ['dolce&gabbana', 'Dolce & Gabbana'],
  ['golden goose', 'Golden Goose'], ['giuseppe zanotti', 'Giuseppe Zanotti'],
  ['gianvito rossi', 'Gianvito Rossi'], ['amina muaddi', 'Amina Muaddi'],
  ['manolo blahnik', 'Manolo Blahnik'], ['christian louboutin', 'Christian Louboutin'],
  ['christian dior', 'Dior'], ['acne studios', 'Acne Studios'],
  ['self-portrait', 'Self-Portrait'], ['self portrait', 'Self-Portrait'],
  ['victoria beckham', 'Victoria Beckham'], ['valentino garavani', 'Valentino'],
  ['roberto cavalli', 'Roberto Cavalli'], ['rick owens', 'Rick Owens'],
  ['ann demeulemeester', 'Ann Demeulemeester'], ['michael michael kors', 'Michael Kors'],
  ['michael kors', 'Michael Kors'], ['marc jacobs', 'Marc Jacobs'],
  ['the north face', 'The North Face'], ['canada goose', 'Canada Goose'],
  ['ralph lauren', 'Ralph Lauren'], ['polo ralph lauren', 'Ralph Lauren'],
  ['tommy hilfiger', 'Tommy Hilfiger'], ['calvin klein', 'Calvin Klein'],
  ['hugo boss', 'BOSS'], ['boss', 'BOSS'], ['philipp plein', 'Philipp Plein'],
  ['salvatore ferragamo', 'Ferragamo'], ['ferragamo', 'Ferragamo'],
  ['emilio pucci', 'Emilio Pucci'], ['alexander mcqueen', 'Alexander McQueen'],
  ['alexander wang', 'Alexander Wang'], ['kate spade', 'Kate Spade'],
  ['van cleef', 'Van Cleef & Arpels'], ['tiffany & co', 'Tiffany & Co.'],
  ['tiffany', 'Tiffany & Co.'], ['david yurman', 'David Yurman'],
  ['monica vinader', 'Monica Vinader'], ['roger vivier', 'Roger Vivier'],
  ['rene caovilla', 'René Caovilla'], ['rené caovilla', 'René Caovilla'],
  ['stuart weitzman', 'Stuart Weitzman'], ['onitsuka tiger', 'Onitsuka Tiger'],
  ['max mara', 'Max Mara'], ['paul smith', 'Paul Smith'],
  ['proenza schouler', 'Proenza Schouler'], ['phillip lim', 'Phillip Lim'],
  ['3.1 phillip lim', 'Phillip Lim'], ['jonathan simkhai', 'Jonathan Simkhai'],
  ['rejina pyo', 'Rejina Pyo'], ['toteme', 'Toteme'], ['nanushka', 'Nanushka'],
  ['we11done', 'we11done'], ['reformation', 'Reformation'],
  ['free people', 'Free People'], ['other stories', '& Other Stories'],
  ['massimo dutti', 'Massimo Dutti'], ['forever 21', 'Forever 21'],
  ['urban outfitters', 'Urban Outfitters'], ['brandy melville', 'Brandy Melville'],
  ['american eagle', 'American Eagle'], ['abercrombie', 'Abercrombie'],
  ['hollister', 'Hollister'], ['topshop', 'Topshop'], ['asos', 'ASOS'],
  ['boohoo', 'Boohoo'], ['prettylittlething', 'PrettyLittleThing'],
  ["victoria's secret", 'Victoria’s Secret'], ['lululemon', 'Lululemon'],
  ["levi's", "Levi's"], ['levis', "Levi's"], ['rag & bone', 'Rag & Bone'],
  ['rag and bone', 'Rag & Bone'], ['jw anderson', 'JW Anderson'],
  ['chloe', 'Chloé'], ['sandro', 'Sandro'], ['maje', 'Maje'],
  ['ba&sh', 'BA&SH'], ['zimmermann', 'Zimmermann'], ['palm angels', 'Palm Angels'],
  ['off-white', 'Off-White'], ['off white', 'Off-White'],
  ['burberry', 'Burberry'], ['gucci', 'Gucci'], ['prada', 'Prada'],
  ['balenciaga', 'Balenciaga'], ['versace', 'Versace'], ['chanel', 'Chanel'],
  ['dior', 'Dior'], ['celine', 'Celine'], ['loewe', 'Loewe'],
  ['givenchy', 'Givenchy'], ['fendi', 'Fendi'], ['miu miu', 'Miu Miu'],
  ['moncler', 'Moncler'], ['balmain', 'Balmain'], ['lanvin', 'Lanvin'],
  ['moschino', 'Moschino'], ['etro', 'Etro'], ['marni', 'Marni'],
  ['kenzo', 'Kenzo'], ['missoni', 'Missoni'], ['trussardi', 'Trussardi'],
  ['emporio armani', 'Emporio Armani'], ['armani', 'Armani'],
  ['tom ford', 'Tom Ford'], ['furla', 'Furla'], ['jacquemus', 'Jacquemus'],
  ['new balance', 'New Balance'], ['nike', 'Nike'], ['adidas', 'Adidas'],
  ['asics', 'Asics'], ['salomon', 'Salomon'], ['birkenstock', 'Birkenstock'],
  ['ugg', 'UGG'], ['veja', 'Veja'], ['crocs', 'Crocs'],
  ['dr. martens', 'Dr. Martens'], ['dr martens', 'Dr. Martens'],
  ['converse', 'Converse'], ['vans', 'Vans'], ['puma', 'Puma'],
  ['reebok', 'Reebok'], ['hoka', 'Hoka'],
  ['jimmy choo', 'Jimmy Choo'], ['aquazzura', 'Aquazzura'], ['casadei', 'Casadei'],
  ['le silla', 'Le Silla'], ['paris texas', 'Paris Texas'],
  ['benedetta bruzziches', 'Benedetta Bruzziches'], ['coach', 'Coach'],
  ['kurt geiger', 'Kurt Geiger'], ['charles & keith', 'Charles & Keith'],
  ['cartier', 'Cartier'], ['pandora', 'Pandora'], ['swarovski', 'Swarovski'],
  ['bvlgari', 'Bvlgari'], ['bulgari', 'Bvlgari'], ['chopard', 'Chopard'],
  ['mejuri', 'Mejuri'], ['apm monaco', 'APM Monaco'],
  ['guess', 'GUESS'], ['lacoste', 'Lacoste'], ['barbour', 'Barbour'],
  ['belstaff', 'Belstaff'], ['stone island', 'Stone Island'],
  ['cp company', 'C.P. Company'], ['shein', 'SHEIN'],
  ['simkhai', 'Simkhai'], ['tibi', 'Tibi'], ['vince', 'Vince'], ['theory', 'Theory'],
  ['zara', 'Zara'], ['mango', 'Mango'], ['uniqlo', 'Uniqlo'], ['h&m', 'H&M'],
  ['river island', 'River Island'], ['nasty gal', 'Nasty Gal'],
  ['jean paul gaultier', 'Jean Paul Gaultier'], ['gaultier', 'Jean Paul Gaultier'],
  ['mansur gavriel', 'Mansur Gavriel'], ['marciano', 'Marciano'],
  ['aloyoga', 'Alo Yoga'], ['alo yoga', 'Alo Yoga'],
  ['petite mendigote', 'Petite Mendigote'], ['sezane', 'Sézane'],
  ['rouje', 'Rouje'], ['claudie pierlot', 'Claudie Pierlot'],
  ['paul & joe', 'Paul & Joe'], ['maison michel', 'Maison Michel'],
  ['dua lipa', 'Dua Lipa'], ['versus', 'Versus Versace'],
  ['herno', 'Herno'], ['woolrich', 'Woolrich'], ['peuterey', 'Peuterey'],
  ['philosophy', 'Philosophy di Lorenzo Serafini'],
  ['lorenzo serafini', 'Philosophy di Lorenzo Serafini'],
  ['n21', 'N°21'], ['no21', 'N°21'], ['n°21', 'N°21'],
  ['mr & mrs italy', 'Mr & Mrs Italy'], ['pinko', 'PINKO'],
  ['liu jo', 'LIU JO'], ['twinset', 'Twinset'], ['patrizia pepe', 'Patrizia Pepe'],
  ['fabi', 'Fabi'], ['francesco russo', 'Francesco Russo'],
  ['gianvito', 'Gianvito Rossi'], ['aquazzura', 'Aquazzura'],
  [' marc', 'Marc Jacobs'], ['candy', 'Candy'],
  ['cavalli class', 'Roberto Cavalli'], ['just cavalli', 'Just Cavalli'],
  ['love moschino', 'Love Moschino'], ['moschino love', 'Love Moschino'],
  ['burberry brit', 'Burberry'], ['burberry london', 'Burberry'],
  ['prada line rossa', 'Prada'], ['linea rossa', 'Prada'],
  ['miu miu', 'Miu Miu'], ['adidas originals', 'Adidas'],
  ['nike sb', 'Nike'], ['jordan', 'Jordan'],
]

const ACTIVE = BRANDS.filter(([match, brand]) => match && brand)

const stripDiacritics = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Сортируем от длинных к коротким, чтобы "saint laurent" выигрывал у "laurent" и т.п.
const MATCHERS = ACTIVE
  .map(([match, brand]) => ({ brand, re: new RegExp(`(?<![a-z0-9])${escapeRegex(match)}(?![a-z0-9])`, 'i') }))
  .sort((a, b) => b.re.source.length - a.re.source.length)

const detectBrandIn = (text) => {
  const normalized = stripDiacritics(String(text || '')).toLowerCase()
  if (!normalized) return ''
  for (const { brand, re } of MATCHERS) {
    if (re.test(normalized)) return brand
  }
  return ''
}

const main = async () => {
  const rows = await db.product.findMany({
    where: { brand: '' },
    select: { id: true, name: true, description: true },
  })
  console.log(`[brands] товаров без бренда: ${rows.length}`)

  const updates = []
  for (const row of rows) {
    // Сначала бренд в названии, затем — в описании (Mytheresa упоминает
    // дизайнера в описании почти всегда)
    const brand = detectBrandIn(row.name) || detectBrandIn(row.description)
    if (brand) updates.push({ id: row.id, brand })
  }

  let done = 0
  for (let i = 0; i < updates.length; i += 200) {
    const batch = updates.slice(i, i + 200)
    await Promise.all(batch.map((u) => db.product.update({ where: { id: u.id }, data: { brand: u.brand } })))
    done += batch.length
    if (done % 10000 === 0) console.log(`[brands] обновлено: ${done}/${updates.length}`)
  }

  console.log(`[brands] найдено брендов: ${updates.length} из ${rows.length} (${Math.round((updates.length / Math.max(1, rows.length)) * 100)}%)`)
  const withBrand = await db.product.count({ where: { brand: { not: '' } } })
  const total = await db.product.count()
  console.log(`[brands] всего товаров с брендом: ${withBrand} из ${total}`)
  await db.$disconnect()
}

main().catch((error) => {
  console.error('[brands] ошибка:', error)
  process.exit(1)
})
