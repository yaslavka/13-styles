// Восстановление связей «товар -> фото» для Garments2Look.
// Фото лежат в git (public/products/g2l/{my|pv}/{slug}-{idx}.webp), но после
// восстановления проекта из репозитория пути в БД потерялись — этот скрипт
// перечитывает список файлов через git ls-files и проставляет каждому товару:
//   images    — JSON-массив путей /products/g2l/...
//   imageAlts — SEO alt-тексты из бренда и названия (требование SEO проекта)
//   published — true (товар с фото попадает на витрину и в sitemap)
// Запуск: node scripts/assign-g2l-images.mjs

import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const cleanName = (value) =>
  String(value || '')
    .replace(/[""'']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140)

const altFor = (brand, name, index) => {
  const base = cleanName(brand ? `${brand} ${name}` : name) || '13 STYLES product'
  return index === 0 ? `${base} — buy online at 13 STYLES` : `${base} — 13 STYLES photo ${index + 1}`
}

const main = async () => {
  // 1) Список фото из git (работает и без выгрузки файлов на диск)
  const output = execSync('git ls-files public/products/g2l', { maxBuffer: 512 * 1024 * 1024 })
    .toString()
  const bySlug = new Map()
  for (const line of output.split('\n')) {
    const file = line.trim()
    if (!file.endsWith('.webp')) continue
    // public/products/g2l/{my|pv}/{slug}-{idx}.webp — публичный URL без префикса /public
    const base = path => path.replace(/^public\/products\/g2l\/(my|pv)\//, '').replace(/\.webp$/, '')
    const stem = base(file)
    const match = stem.match(/^(.*)-(\d+)$/)
    const slug = match ? match[1] : stem
    const idx = match ? Number(match[2]) : 1
    if (!bySlug.has(slug)) bySlug.set(slug, [])
    bySlug.get(slug).push({ idx, path: `/${file.replace(/^public\//, '')}` })
  }
  for (const list of bySlug.values()) list.sort((a, b) => a.idx - b.idx)
  console.log(`Фото в git: ${output.split('\n').filter((l) => l.trim().endsWith('.webp')).length}, товаров с фото: ${bySlug.size}`)

  // 2) Товары g2l в БД
  const BATCH = 5_000
  let cursor = 0
  let updated = 0
  let skippedNoPhoto = 0
  let alreadyDone = 0
  const total = await db.product.count({ where: { slug: { startsWith: 'g2l-' } } })
  console.log(`Товаров g2l в БД: ${total}`)

  while (cursor < total) {
    const rows = await db.product.findMany({
      where: { slug: { startsWith: 'g2l-' } },
      orderBy: { id: 'asc' },
      select: { id: true, slug: true, name: true, brand: true, images: true, published: true },
      skip: cursor,
      take: BATCH,
    })
    if (!rows.length) break
    cursor += rows.length

    const updates = []
    for (const row of rows) {
      const files = bySlug.get(row.slug)
      if (!files || files.length === 0) {
        skippedNoPhoto += 1
        continue
      }
      // Уже заполнены корректными путями (не начинается с «/public/») — пропускаем
      const alreadyOk = row.images && row.images !== '[]' && !row.images.includes('"/public/') && row.published
      if (alreadyOk) {
        alreadyDone += 1
        continue
      }
      const images = files.map((f) => f.path)
      const imageAlts = images.map((_, index) => altFor(row.brand, row.name, index))
      updates.push(
        db.product.update({
          where: { id: row.id },
          data: { images: JSON.stringify(images), imageAlts: JSON.stringify(imageAlts), published: true },
        })
      )
    }

    if (updates.length) {
      await db.$transaction(updates)
      updated += updates.length
    }
    process.stdout.write(`\rОбработано ${Math.min(cursor, total)}/${total}, обновлено ${updated}`)
  }

  console.log(`\nГотово: обновлено ${updated}, уже имели фото ${alreadyDone}, без фото пропущено ${skippedNoPhoto}`)
  const publishedNow = await db.product.count({ where: { published: true } })
  console.log(`Опубликовано всего: ${publishedNow}`)
  await db.$disconnect()
}

main().catch(async (error) => {
  console.error('[assign-g2l] ошибка:', error?.message || error)
  await db.$disconnect().catch(() => {})
  process.exit(1)
})
