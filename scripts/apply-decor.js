// Разовая миграция данных 13 STYLES:
//  1) помечает товары-декор главной страницы (decor: true), чтобы они не попадали в каталог
//  2) создаёт стартовые подкатегории для каждой категории
// Запуск: bun scripts/apply-decor.js

import { db } from '../src/lib/db.js'
import { slugify } from '../src/lib/constants.js'

// Товары из анимированной Hero-секции главной — это декор, а не витринные позиции
const DECOR_SLUGS = [
  'hoodie-neo-violet',
  'sneakers-run-orange',
  'dress-neon-violet',
  'backpack-data-violet',
]

// Стартовые подкатегории: [категория, [названия]]
const SUBCATEGORIES_SEED = [
  ['men', ['Hoodies & Sweats', 'T-shirts', 'Jeans', 'Bombers & Jackets']],
  ['women', ['Dresses', 'Hoodies & Crop', 'Tops & Shirts', 'Jackets']],
  ['shoes', ['Sneakers', 'High-tops', 'Boots']],
  ['accessories', ['Caps', 'Backpacks', 'Sunglasses', 'Watches']],
]

const main = async () => {
  console.log('[decor] помечаем товары-декор главной страницы')
  for (const slug of DECOR_SLUGS) {
    const row = await db.product.findUnique({ where: { slug } })
    if (!row) {
      console.log(`[decor] пропущен (не найден): ${slug}`)
      continue
    }
    await db.product.update({ where: { id: row.id }, data: { decor: true } })
    console.log(`[decor] decor=true: ${slug}`)
  }

  console.log('[subcategories] создаём стартовые подкатегории')
  for (const [categorySlug, names] of SUBCATEGORIES_SEED) {
    const category = await db.category.findUnique({ where: { slug: categorySlug } })
    if (!category) {
      console.log(`[subcategories] категория не найдена: ${categorySlug}`)
      continue
    }
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index]
      const slug = `${categorySlug}-${slugify(name)}`
      await db.subcategory.upsert({
        where: { slug },
        create: { slug, name, sort: index + 1, categoryId: category.id },
        update: { name, sort: index + 1, categoryId: category.id },
      })
      console.log(`[subcategories] ${categorySlug}: ${name}`)
    }
  }

  const [decorCount, subcategoryCount] = await Promise.all([
    db.product.count({ where: { decor: true } }),
    db.subcategory.count(),
  ])
  console.log(`[migrate] готово: decor=${decorCount}, подкатегорий=${subcategoryCount}`)
}

main()
  .catch((error) => {
    console.error('[migrate] ошибка:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
