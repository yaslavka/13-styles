// Наполнение БД PIXART MARKET: 4 категории + 16 товаров
// Запуск: bun scripts/seed.js

import { db } from '../src/lib/db.js'
import { CATEGORIES_SEED, CLOTHING_SIZES, SHOE_SIZES } from '../src/lib/constants.js'

const img = (sprite, colorway) => [1, 2, 3].map((n) => `/products/${sprite}-${colorway}-${n}.svg`)

const PRODUCTS = [
  {
    slug: 'hoodie-neo-violet',
    name: 'Худи PIXART NEO Violet',
    category: 'men',
    gender: 'men',
    price: 4990,
    oldPrice: 6990,
    label: 'hit',
    featured: true,
    stock: 24,
    rating: 4.9,
    reviews: 128,
    sizes: CLOTHING_SIZES,
    colors: ['violet', 'orange', 'blue'],
    images: img('hoodie', 'violet'),
    shortDesc: 'Оверсайз-худи из плотного футера с пиксельным принтом и капюшоном на кулиске.',
    description:
      'Флагманское худи коллекции NEO. Плотный трёхниточный футер с начёсом, двойной капюшон на широких кулисках, карман-кенгуру с подкроем. Пиксель-арт принт устойчив к 50+ стиркам. Свободный крой оверсайз — садится идеально на подростковые и взрослые размеры от XS до XXL.',
  },
  {
    slug: 'tshirt-pixel-drip-orange',
    name: 'Футболка PIXEL DRIP Orange',
    category: 'men',
    gender: 'men',
    price: 1990,
    oldPrice: 2990,
    label: 'sale',
    featured: false,
    stock: 40,
    rating: 4.7,
    reviews: 86,
    sizes: CLOTHING_SIZES,
    colors: ['orange', 'blue', 'violet'],
    images: img('tshirt', 'orange'),
    shortDesc: 'Базовая футболка с рельефным пиксель-принтом и двойной строчкой по низу.',
    description:
      'Классический силуэт с плечом, опущенным на 2 см — тренд стритвир-сцены. Кулирка 190 г/м² из гребенной пряжи не скатывается и держит форму. Принт DRIP нанесён методом шелкографии с PLW-топом.',
  },
  {
    slug: 'bomber-cyber-wind-blue',
    name: 'Бомбер CYBER WIND Blue',
    category: 'men',
    gender: 'men',
    price: 8990,
    oldPrice: 11990,
    label: 'new',
    featured: true,
    stock: 14,
    rating: 4.8,
    reviews: 47,
    sizes: CLOTHING_SIZES,
    colors: ['blue', 'night', 'violet'],
    images: img('jacket', 'blue'),
    shortDesc: 'Бомбер на молнии с ветрозащитной мембраной и вязаными трикотажными манжетами.',
    description:
      'Ветрозащитный бомбер для прохладных вечеров. Мембрана 5000 мм, подкладка из гладкого нейлона, двусторонняя молния YKK. Трикотажные манжеты и низ в рубчик удерживают тепло. Скрытые карманы на молнии по бокам.',
  },
  {
    slug: 'jeans-grid-loose-blue',
    name: 'Джинсы GRID LOOSE Blue',
    category: 'men',
    gender: 'men',
    price: 5490,
    oldPrice: null,
    label: 'none',
    featured: false,
    stock: 30,
    rating: 4.6,
    reviews: 64,
    sizes: CLOTHING_SIZES,
    colors: ['blue', 'night'],
    images: img('pants', 'blue'),
    shortDesc: 'Свободные джинсы из хлопка с посадкой baggy и контрастными отстрочками.',
    description:
      'Baggy-крой с высокой посадкой и широкым штаниной. Деним 12 унций из 100% хлопка, мягко заламывается по коленям. Контрастная жёлтая отстрочка, фирменные заклёпки и петли для ремня усиленного типа.',
  },
  {
    slug: 'dress-neon-midi-violet',
    name: 'Платье NEON MIDI Violet',
    category: 'women',
    gender: 'women',
    price: 6990,
    oldPrice: 8990,
    label: 'hit',
    featured: true,
    stock: 18,
    rating: 4.9,
    reviews: 152,
    sizes: CLOTHING_SIZES,
    colors: ['violet', 'lilac', 'orange'],
    images: img('dress', 'violet'),
    shortDesc: 'Платье миди А-силуэта с неоновым пиксельным принтом и поясом в тон.',
    description:
      'А-силуэт с завышенной талией визуально удлиняет силуэт. Вискозный трикотаж с эластаном мягко драпируется и не мнётся в дороге. Рукав-фонарик 3/4 и съёмный пояс в комплекте. Принт NEON светится под ультрафиолетом на вечеринках.',
  },
  {
    slug: 'hoodie-pastel-glow-lilac',
    name: 'Худи PASTEL GLOW Lilac',
    category: 'women',
    gender: 'women',
    price: 5290,
    oldPrice: null,
    label: 'new',
    featured: true,
    stock: 22,
    rating: 4.8,
    reviews: 58,
    sizes: CLOTHING_SIZES,
    colors: ['lilac', 'orange', 'violet'],
    images: img('hoodie', 'lilac'),
    shortDesc: 'Пастельное худи кроп-посадки с широкими рукавами и вышивкой-глоу.',
    description:
      'Мягчайшее худи из петельчатого трикотажа с начёсом. Кроп-посадка на 4 см выше классической, широкие рукава со спущенным плечом. Вышивка GLOW светящейся нитью: днём пастель, ночью — глоу-эффект.',
  },
  {
    slug: 'crop-pixel-chic-lilac',
    name: 'Кроп-топ PIXEL CHIC Lilac',
    category: 'women',
    gender: 'women',
    price: 1790,
    oldPrice: 2490,
    label: 'sale',
    featured: false,
    stock: 36,
    rating: 4.5,
    reviews: 73,
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['lilac', 'violet', 'orange'],
    images: img('tshirt', 'lilac'),
    shortDesc: 'Укороченный топ из рибаны с пиксельным чипом на груди.',
    description:
      'Плотная рибана держит форму и не просвечивает. Укороченный крой с двойным подгибом. Пиксельный чип-принт — отсылка к ретро-играм, нанесён гибкой краской, не трескается на сгибах.',
  },
  {
    slug: 'jacket-retro-vibe-orange',
    name: 'Куртка RETRO VIBE Orange',
    category: 'women',
    gender: 'women',
    price: 7990,
    oldPrice: null,
    label: 'new',
    featured: false,
    stock: 15,
    rating: 4.7,
    reviews: 31,
    sizes: CLOTHING_SIZES,
    colors: ['orange', 'lilac'],
    images: img('jacket', 'orange'),
    shortDesc: 'Оверсайз-куртка с контрастными вставками и крупными пиксель-патчами.',
    description:
      'Куртка свободного кроя из тканного дюспо с водонеотталкивающей пропиткой. Контрастные вставки на плечах и крупные термо-патчи в пиксельной стилистике. Внутренний карман для телефона с выходом под наушники.',
  },
  {
    slug: 'sneakers-pixel-run-orange',
    name: 'Кроссовки PIXEL RUN Orange',
    category: 'shoes',
    gender: 'unisex',
    price: 7990,
    oldPrice: 9990,
    label: 'hit',
    featured: true,
    stock: 26,
    rating: 4.8,
    reviews: 194,
    sizes: SHOE_SIZES,
    colors: ['orange', 'violet', 'blue'],
    images: img('sneaker', 'orange'),
    shortDesc: 'Беговые кроссовки с амортизирующей подошвой EVA и светоотражающими деталями.',
    description:
      'Лёгкие кроссовки для города и лёгкого бега. Подошва EVA с пяточным гелем гасит ударные нагрузки, дышащий сетчатый верх держит стопу. Светоотражающие вставки на пятке и язычке — заметен в темноте. Съёмная анатомическая стелька.',
  },
  {
    slug: 'sneakers-grid-force-blue',
    name: 'Кроссовки GRID FORCE Blue',
    category: 'shoes',
    gender: 'unisex',
    price: 8490,
    oldPrice: null,
    label: 'hit',
    featured: false,
    stock: 20,
    rating: 4.7,
    reviews: 88,
    sizes: SHOE_SIZES,
    colors: ['blue', 'night'],
    images: img('sneaker', 'blue'),
    shortDesc: 'Скид-стил кроссовки с жёсткой фиксацией и износостойкой резиной Vibra-Grip.',
    description:
      'Минималистичный силуэт скид-стил из гладкой кожи с перфорацией. Усиленная пятка и плотная шнуровка фиксируют стопу при резких движениях. Резина Vibra-Grip не скользит на мокром асфальте.',
  },
  {
    slug: 'boots-urban-tactic-night',
    name: 'Ботинки URBAN TACTIC Night',
    category: 'shoes',
    gender: 'men',
    price: 9490,
    oldPrice: 11490,
    label: 'sale',
    featured: false,
    stock: 12,
    rating: 4.6,
    reviews: 41,
    sizes: ['40', '41', '42', '43', '44', '45'],
    colors: ['night', 'blue'],
    images: img('boot', 'night'),
    shortDesc: 'Высокие ботинки с мембраной от промокания и протектором для скользких улиц.',
    description:
      'Хайк-ботинки в тактическом стиле. Нубук с водоотталкивающей мембраной держит ноги сухими в дождь и мокрый снег. Протекторная подошва с глубиной протектора 5 мм, усиленный задник и быстрая шнуровка.',
  },
  {
    slug: 'hightops-neon-storm-violet',
    name: 'Хайтопы NEON STORM Violet',
    category: 'shoes',
    gender: 'women',
    price: 8990,
    oldPrice: null,
    label: 'new',
    featured: true,
    stock: 16,
    rating: 4.8,
    reviews: 39,
    sizes: ['36', '37', '38', '39', '40', '41'],
    colors: ['violet', 'lilac', 'orange'],
    images: img('boot', 'violet'),
    shortDesc: 'Высокие кеды с неоновыми шнурками и стёганой боковиной.',
    description:
      'Хайтопы на толстой подошве в стиле скеит-культуры. Канвас двойной плотности, стёганая боковина и металлические люверсы. Неоновые шнурки в комплекте плюс классические белые — меняй образ под настроение.',
  },
  {
    slug: 'cap-pixel-drip-orange',
    name: 'Кэп PIXEL DRIP Cap Orange',
    category: 'accessories',
    gender: 'unisex',
    price: 1990,
    oldPrice: 2590,
    label: 'sale',
    featured: false,
    stock: 50,
    rating: 4.6,
    reviews: 97,
    sizes: [],
    colors: ['orange', 'blue', 'violet'],
    images: img('cap', 'orange'),
    shortDesc: 'Бейсболка с глубоким козырьком, вышивкой-пиксель и регулируемым ремешком.',
    description:
      'Шестипанельная бейсболка из плотного твила. Глубокий изогнутый козырень защищает от солнца, вышивка DRIP выполнена объёмной нитью. Металлическая клипса ремешка регулирует обхват от 54 до 60 см.',
  },
  {
    slug: 'backpack-data-pack-violet',
    name: 'Рюкзак DATA PACK Violet',
    category: 'accessories',
    gender: 'unisex',
    price: 4990,
    oldPrice: null,
    label: 'hit',
    featured: true,
    stock: 28,
    rating: 4.9,
    reviews: 143,
    sizes: [],
    colors: ['violet', 'orange', 'blue'],
    images: img('backpack', 'violet'),
    shortDesc: 'Городской рюкзак 22 л с отделением для ноутбука 15" и влагозащитой.',
    description:
      'Рюкзак для учёбы и прогулок: отделение для ноутбука 15", органайзер, потайной карман у спины. Корпус из рипстоп-нейлона с водоотталкивающей пропиткой, молнии с влагозащитными клапанами. Вентилируемая спинка и USB-порт для пауэрбанка.',
  },
  {
    slug: 'sunglasses-cyber-shade-blue',
    name: 'Очки CYBER SHADE Blue',
    category: 'accessories',
    gender: 'unisex',
    price: 2990,
    oldPrice: null,
    label: 'new',
    featured: false,
    stock: 34,
    rating: 4.5,
    reviews: 52,
    sizes: [],
    colors: ['blue', 'violet', 'night'],
    images: img('sunglasses', 'blue'),
    shortDesc: 'Солнцезащитные очки визор-формы с поляризацией и UV400-фильтром.',
    description:
      'Очки-визор в кибер-стилистике: одна широкая линза, цельная оправа из полиамида. Поляризация убирает блики от асфальта и воды, фильтр UV400 блокирует UVA/UVB. В комплекте жёсткий кейс и салфетка из микрофибры.',
  },
  {
    slug: 'watch-pixel-time-orange',
    name: 'Часы PIXEL TIME Orange',
    category: 'accessories',
    gender: 'unisex',
    price: 5990,
    oldPrice: 7490,
    label: 'sale',
    featured: false,
    stock: 21,
    rating: 4.7,
    reviews: 67,
    sizes: [],
    colors: ['orange', 'violet', 'night'],
    images: img('watch', 'orange'),
    shortDesc: 'Кварцевые часы с пиксельным циферблатом, сапфировым стеклом и браслетом-ремешком.',
    description:
      'Часы с сегментным пиксель-циферблатом: индексы как в 8-битных играх. Японский кварцевый механизм Seiko, сапфировое стекло с антибликом. Силиконовый браслет-ремешок с пинами быстрой замены, водозащита 5 ATM.',
  },
]

const main = async () => {
  console.log('[seed] старт наполнения PIXART MARKET')

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
      images: JSON.stringify(product.images),
      label: product.label,
      stock: product.stock,
      rating: product.rating,
      reviews: product.reviews,
      featured: product.featured,
      published: true,
      categoryId,
    }
    await db.product.upsert({ where: { slug: product.slug }, create: data, update: data })
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
