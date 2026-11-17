// Наполнение БД 13 STYLES: 4 категории + 16 товаров с мультяшными 3D рендерами
// Запуск: bun scripts/seed.js (сначала генерирует картинки: bun run images:gen)

import { db } from '../src/lib/db.js'
import { CATEGORIES_SEED, CLOTHING_SIZES, SHOE_SIZES } from '../src/lib/constants.js'

const img = (slug) => [1, 2, 3].map((n) => `/products/${slug}-${n}.png`)

const PRODUCTS = [
  {
    slug: 'hoodie-neo-violet',
    name: 'NEO Hoodie Violet',
    category: 'men',
    gender: 'men',
    price: 59,
    oldPrice: 79,
    label: 'hit',
    featured: true,
    stock: 24,
    rating: 4.9,
    reviews: 128,
    sizes: CLOTHING_SIZES,
    colors: ['violet', 'orange', 'blue'],
    shortDesc: 'Oversized heavyweight hoodie with a cartoon-print chest panel and drawstring hood.',
    description:
      'The flagship hoodie of the NEO collection. Thick brushed fleece, double-layer hood with wide drawstrings and a roomy kangaroo pocket. The cartoon print survives 50+ washes. Relaxed oversized cut that fits teens and adults from XS to XXL.',
  },
  {
    slug: 'tshirt-drip-orange',
    name: 'DRIP Tee Orange',
    category: 'men',
    gender: 'men',
    price: 19,
    oldPrice: 29,
    label: 'sale',
    featured: false,
    stock: 40,
    rating: 4.7,
    reviews: 86,
    sizes: CLOTHING_SIZES,
    colors: ['orange', 'blue', 'violet'],
    shortDesc: 'Everyday tee with a raised cartoon graphic and double-stitched hem.',
    description:
      'Classic silhouette with a 2 cm dropped shoulder straight from the streetwear scene. 190 g/m² combed cotton jersey that keeps its shape wash after wash. The DRIP graphic is screen-printed with a soft-touch top coat.',
  },
  {
    slug: 'bomber-cyber-blue',
    name: 'CYBER Bomber Blue',
    category: 'men',
    gender: 'men',
    price: 89,
    oldPrice: 119,
    label: 'new',
    featured: true,
    stock: 14,
    rating: 4.8,
    reviews: 47,
    sizes: CLOTHING_SIZES,
    colors: ['blue', 'night', 'violet'],
    shortDesc: 'Zip-up bomber with a windproof membrane and knitted rib cuffs.',
    description:
      'A windproof bomber for chilly evenings. 5000 mm membrane, smooth nylon lining and a two-way YKK zipper. Rib-knit cuffs and hem lock the warmth in. Hidden side zip pockets for your essentials.',
  },
  {
    slug: 'jeans-grid-blue',
    name: 'GRID Baggy Jeans Blue',
    category: 'men',
    gender: 'men',
    price: 54,
    oldPrice: null,
    label: 'none',
    featured: false,
    stock: 30,
    rating: 4.6,
    reviews: 64,
    sizes: CLOTHING_SIZES,
    colors: ['blue', 'night'],
    shortDesc: 'Baggy-fit jeans in soft denim with contrast stitching.',
    description:
      'Baggy fit with a high rise and wide leg. 12 oz denim in 100% cotton that breaks in beautifully at the knees. Contrast golden stitching, branded rivets and reinforced belt loops.',
  },
  {
    slug: 'dress-neon-violet',
    name: 'NEON Midi Dress Violet',
    category: 'women',
    gender: 'women',
    price: 69,
    oldPrice: 89,
    label: 'hit',
    featured: true,
    stock: 18,
    rating: 4.9,
    reviews: 152,
    sizes: CLOTHING_SIZES,
    colors: ['violet', 'lilac', 'orange'],
    shortDesc: 'A-line midi dress with a cartoon print and matching belt.',
    description:
      'The A-line silhouette with a raised waist visually stretches the figure. Viscose jersey with a touch of elastane drapes softly and never wrinkles in your bag. Balloon sleeves in 3/4 length, detachable belt included. The NEON print glows under UV light at parties.',
  },
  {
    slug: 'hoodie-pastel-lilac',
    name: 'PASTEL GLOW Hoodie Lilac',
    category: 'women',
    gender: 'women',
    price: 52,
    oldPrice: null,
    label: 'new',
    featured: true,
    stock: 22,
    rating: 4.8,
    reviews: 58,
    sizes: CLOTHING_SIZES,
    colors: ['lilac', 'orange', 'violet'],
    shortDesc: 'Pastel cropped hoodie with wide sleeves and a glow-embroidery.',
    description:
      'The softest hoodie in brushed loopback cotton. Cropped fit sits 4 cm above the classic line, wide sleeves with dropped shoulders. The GLOW embroidery switches on at night: pastel by day, glow by night.',
  },
  {
    slug: 'crop-chic-lilac',
    name: 'CHIC Crop Top Lilac',
    category: 'women',
    gender: 'women',
    price: 17,
    oldPrice: 24,
    label: 'sale',
    featured: false,
    stock: 36,
    rating: 4.5,
    reviews: 73,
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['lilac', 'violet', 'orange'],
    shortDesc: 'Cropped ribbed top with a glossy cartoon chip print.',
    description:
      'Dense rib knit holds its shape and never goes see-through. Cropped cut with a double-turned hem. The glossy chip print is applied with flexible ink that never cracks in the folds.',
  },
  {
    slug: 'jacket-retro-orange',
    name: 'RETRO VIBE Jacket Orange',
    category: 'women',
    gender: 'women',
    price: 79,
    oldPrice: null,
    label: 'new',
    featured: false,
    stock: 15,
    rating: 4.7,
    reviews: 31,
    sizes: CLOTHING_SIZES,
    colors: ['orange', 'lilac'],
    shortDesc: 'Oversized jacket with contrast inserts and big glossy patches.',
    description:
      'Free-cut jacket in woven taslan with a water-repellent finish. Contrast shoulder inserts and large heat-pressed cartoon patches. Inner zip pocket with a cable pass-through for your phone.',
  },
  {
    slug: 'sneakers-run-orange',
    name: 'RUN Sneakers Orange',
    category: 'shoes',
    gender: 'unisex',
    price: 79,
    oldPrice: 99,
    label: 'hit',
    featured: true,
    stock: 26,
    rating: 4.8,
    reviews: 194,
    sizes: SHOE_SIZES,
    colors: ['orange', 'violet', 'blue'],
    shortDesc: 'Running sneakers with a cushioning EVA midsole and reflective details.',
    description:
      'Lightweight sneakers for the city and easy runs. The EVA midsole with a heel gel pad absorbs impact while the breathable mesh upper locks your foot in. Reflective inserts on the heel and tongue keep you visible after dark. Removable anatomical insole.',
  },
  {
    slug: 'sneakers-force-blue',
    name: 'FORCE Sneakers Blue',
    category: 'shoes',
    gender: 'unisex',
    price: 84,
    oldPrice: null,
    label: 'hit',
    featured: false,
    stock: 20,
    rating: 4.7,
    reviews: 88,
    sizes: SHOE_SIZES,
    colors: ['blue', 'night'],
    shortDesc: 'Slip-style sneakers with firm lockdown and wear-proof Vibra-Grip rubber.',
    description:
      'Minimal slip-style silhouette in smooth perforated leather. A reinforced heel and dense lacing lock the foot in for sharp moves. Vibra-Grip rubber never slips on wet asphalt.',
  },
  {
    slug: 'boots-urban-night',
    name: 'URBAN Boots Night',
    category: 'shoes',
    gender: 'men',
    price: 94,
    oldPrice: 114,
    label: 'sale',
    featured: false,
    stock: 12,
    rating: 4.6,
    reviews: 41,
    sizes: ['40', '41', '42', '43', '44', '45'],
    colors: ['night', 'blue'],
    shortDesc: 'High boots with a waterproof membrane and a grip sole for wet streets.',
    description:
      'High-cut boots in a tactical mood. Water-repellent nubuck with a membrane keeps your feet dry in rain and wet snow. 5 mm lug tread sole, reinforced heel counter and speed lacing.',
  },
  {
    slug: 'hightops-storm-violet',
    name: 'STORM High-tops Violet',
    category: 'shoes',
    gender: 'women',
    price: 89,
    oldPrice: null,
    label: 'new',
    featured: true,
    stock: 16,
    rating: 4.8,
    reviews: 39,
    sizes: ['36', '37', '38', '39', '40', '41'],
    colors: ['violet', 'lilac', 'orange'],
    shortDesc: 'High-top sneakers with chunky sole and quilted side panels.',
    description:
      'High-tops on a chunky sole straight from skate culture. Double-density canvas, quilted side panels and metal eyelets. Neon laces included plus classic white ones — switch the mood any day.',
  },
  {
    slug: 'cap-drip-orange',
    name: 'DRIP Cap Orange',
    category: 'accessories',
    gender: 'unisex',
    price: 19,
    oldPrice: 25,
    label: 'sale',
    featured: false,
    stock: 50,
    rating: 4.6,
    reviews: 97,
    sizes: [],
    colors: ['orange', 'blue', 'violet'],
    shortDesc: 'Six-panel baseball cap with a deep brim and glossy embroidery.',
    description:
      'Six-panel cap in dense twill. The deep pre-curved brim blocks the sun while the DRIP embroidery is done in raised thread. Metal clip on the back strap adjusts from 54 to 60 cm.',
  },
  {
    slug: 'backpack-data-violet',
    name: 'DATA Pack Backpack Violet',
    category: 'accessories',
    gender: 'unisex',
    price: 49,
    oldPrice: null,
    label: 'hit',
    featured: true,
    stock: 28,
    rating: 4.9,
    reviews: 143,
    sizes: [],
    colors: ['violet', 'orange', 'blue'],
    shortDesc: '22 L city backpack with a 15" laptop sleeve and water-repellent shell.',
    description:
      'A backpack for classes and hangouts: 15" laptop sleeve, organizer panel and a hidden back pocket. Ripstop nylon shell with a water-repellent finish, guarded zippers. Ventilated back panel and a pass-through port for your power bank.',
  },
  {
    slug: 'sunglasses-cyber-blue',
    name: 'CYBER Shades Blue',
    category: 'accessories',
    gender: 'unisex',
    price: 29,
    oldPrice: null,
    label: 'new',
    featured: false,
    stock: 34,
    rating: 4.5,
    reviews: 52,
    sizes: [],
    colors: ['blue', 'violet', 'night'],
    shortDesc: 'Visor sunglasses with polarized single lens and UV400 filter.',
    description:
      'Visor shades with a cyber mood: one wide lens in a single polyamide frame. Polarization kills asphalt and water glare while UV400 blocks UVA/UVB. Hard case and microfiber cloth included.',
  },
  {
    slug: 'watch-time-orange',
    name: 'TIME Watch Orange',
    category: 'accessories',
    gender: 'unisex',
    price: 59,
    oldPrice: 74,
    label: 'sale',
    featured: false,
    stock: 21,
    rating: 4.7,
    reviews: 67,
    sizes: [],
    colors: ['orange', 'violet', 'night'],
    shortDesc: 'Quartz watch with glossy dial, sapphire glass and silicone strap.',
    description:
      'A watch with a glossy segmented dial like a cartoon clock face. Japanese Seiko quartz movement, sapphire glass with anti-glare coat. Silicone strap with quick-release pins, 5 ATM water resistance.',
  },
]

const main = async () => {
  console.log('[seed] пополнение каталога 13 STYLES')

  const categoryIdBySlug = new Map()
  for (const category of CATEGORIES_SEED) {
    const row = await db.category.upsert({
      where: { slug: category.slug },
      create: { ...category },
      update: { name: category.name, subtitle: category.subtitle, icon: category.icon, style: category.style, sort: category.sort },
    })
    categoryIdBySlug.set(category.slug, row.id)
    console.log(`[seed] категория: ${row.name}`)
  }

  // Полная замена товаров (старые пиксельные позиции больше не актуальны)
  await db.product.deleteMany({})

  for (const product of PRODUCTS) {
    const categoryId = categoryIdBySlug.get(product.category)
    if (!categoryId) throw new Error(`Категория ${product.category} не найдена для ${product.slug}`)
    const data = {
      slug: product.slug,
      name: product.name,
      shortDesc: product.shortDesc,
      description: product.description,
      price: product.price,
      oldPrice: product.oldPrice,
      gender: product.gender,
      sizes: JSON.stringify(product.sizes),
      colors: JSON.stringify(product.colors),
      images: JSON.stringify(img(product.slug)),
      label: product.label,
      stock: product.stock,
      rating: product.rating,
      reviews: product.reviews,
      featured: product.featured,
      published: true,
      categoryId,
    }
    await db.product.create({ data })
    console.log(`[seed] товар: ${product.name}`)
  }

  const totals = await db.$transaction([db.category.count(), db.product.count()])
  console.log(`[seed] готово: категорий ${totals[0]}, товаров ${totals[1]}`)
}

main()
  .catch((error) => {
    console.error('[seed] ошибка:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
