// Импорт каталога в БД по манифесту data/catalog-manifest.json
// (товары без людей на фото, картинки уже лежат в public/products/catalog/*.webp)
// Запуск: bun scripts/import-catalog.js

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const db = new PrismaClient()

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf-8'))

const main = async () => {
  const plan = readJson('data/import-plan.json')
  const manifest = readJson('data/catalog-manifest.json')
  const imagesBySlug = new Map(manifest.products.map((p) => [p.slug, p.images]))

  // 1) Скрываем старые обычные товары (decor остаются как есть)
  const hidden = await db.product.updateMany({
    where: { decor: false, NOT: { images: { contains: '"/products/catalog/' } } },
    data: { published: false },
  })
  console.log(`[import] скрыто старых товаров: ${hidden.count}`)

  // 2) Категории
  const categories = await db.category.findMany()
  const catBySlug = new Map(categories.map((c) => [c.slug, c.id]))

  // 3) Подкатегории — upsert всех 43 из плана
  for (const sub of plan.subcategories) {
    const categoryId = catBySlug.get(sub.categorySlug)
    if (!categoryId) continue
    const slug = `${sub.categorySlug}-${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`
    await db.subcategory.upsert({
      where: { slug },
      update: { name: sub.name, sort: sub.sort, categoryId },
      create: { slug, name: sub.name, sort: sub.sort, categoryId },
    })
  }
  const subcategories = await db.subcategory.findMany()
  const subByKey = new Map(subcategories.map((s) => [`${s.categoryId}|${s.name}`, s.id]))

  // 4) Удаляем каталожные товары, которых больше нет в манифесте
  const manifestSlugs = new Set(manifest.products.map((p) => p.slug))
  const stale = await db.product.findMany({
    where: { images: { contains: '"/products/catalog/' } },
    select: { id: true, slug: true },
  })
  let deleted = 0
  for (const p of stale) {
    if (!manifestSlugs.has(p.slug)) {
      await db.product.delete({ where: { id: p.id } })
      deleted += 1
    }
  }
  console.log(`[import] удалено устаревших каталожных: ${deleted}`)

  // 5) Импорт чистых товаров
  let ok = 0
  let skipped = 0
  for (const p of plan.products) {
    const images = imagesBySlug.get(p.slug)
    if (!images || images.length === 0) {
      skipped += 1
      continue
    }
    const categoryId = catBySlug.get(p.categorySlug)
    if (!categoryId) {
      skipped += 1
      continue
    }
    const subcategoryId = subByKey.get(`${categoryId}|${p.subcategoryName}`) || null
    await db.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        shortDesc: p.shortDesc,
        description: p.description,
        price: p.price,
        oldPrice: p.oldPrice,
        gender: p.gender,
        sizes: JSON.stringify(p.sizes),
        colors: JSON.stringify(p.colors),
        images: JSON.stringify(images),
        label: p.label,
        stock: p.stock,
        rating: p.rating,
        reviews: p.reviews,
        featured: p.featured,
        published: true,
        decor: false,
        categoryId,
        subcategoryId,
        createdAt: new Date(p.createdAt),
      },
      create: {
        slug: p.slug,
        name: p.name,
        shortDesc: p.shortDesc,
        description: p.description,
        price: p.price,
        oldPrice: p.oldPrice,
        gender: p.gender,
        sizes: JSON.stringify(p.sizes),
        colors: JSON.stringify(p.colors),
        images: JSON.stringify(images),
        label: p.label,
        stock: p.stock,
        rating: p.rating,
        reviews: p.reviews,
        featured: p.featured,
        published: true,
        decor: false,
        categoryId,
        subcategoryId,
        createdAt: new Date(p.createdAt),
      },
    })
    ok += 1
  }

  const inCatalog = await db.product.count({ where: { published: true, decor: false } })
  console.log(`[import] импортировано: ${ok} • пропущено: ${skipped} • видимых в каталоге: ${inCatalog}`)
  await db.$disconnect()
}

main().catch((e) => {
  console.error('[import] фатальная ошибка:', e)
  process.exit(1)
})
