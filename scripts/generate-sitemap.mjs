// Генератор SEO-файлов 13 STYLES: РОВНО ДВА ФАЙЛА для индексирующего робота.
//
//   public/sitemap.xml — ВСЕ маршруты в одном файле: главная, каталог, стили,
//                        категории, подкатегории и все опубликованные товары
//   public/robots.txt  — правила обхода + ссылка на sitemap
//
// Вся остальная SEO-оптимизация (canonical, meta, robots-директивы, OG,
// JSON-LD) живёт в коде страниц, а не в файлах для роботов.
//
// Запуск: node scripts/generate-sitemap.mjs [--url https://example.com]
// Адрес сайта берётся из --url, затем NEXT_PUBLIC_SITE_URL/SITE_URL.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PUBLIC_DIR = path.join(ROOT, 'public')

const urlFlagIndex = process.argv.indexOf('--url')
const SITE_URL = String(
  (urlFlagIndex !== -1 && process.argv[urlFlagIndex + 1]) ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'https://13styles.example'
).replace(/\/+$/, '')

const db = new PrismaClient()

const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const xmlDate = (date) => (date ? new Date(date).toISOString() : undefined)

const urlEntry = ({ loc, lastmod, changefreq = 'weekly', priority = '0.7' }) => {
  const parts = [`    <loc>${escapeXml(loc)}</loc>`]
  const modified = xmlDate(lastmod)
  if (modified) parts.push(`    <lastmod>${modified}</lastmod>`)
  parts.push(`    <changefreq>${changefreq}</changefreq>`)
  parts.push(`    <priority>${priority}</priority>`)
  return `  <url>\n${parts.join('\n')}\n  </url>`
}

const main = async () => {
  // Легаси-папка public/sitemap от старых сборок больше не нужна
  const legacyDir = path.join(PUBLIC_DIR, 'sitemap')
  if (fs.existsSync(legacyDir)) {
    for (const entry of fs.readdirSync(legacyDir)) fs.rmSync(path.join(legacyDir, entry))
    fs.rmdirSync(legacyDir)
    console.log('  легаси-папка public/sitemap/ удалена')
  }

  const entries = []

  // --- Страницы витрины ------------------------------------------------------
  entries.push(
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/catalog`, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE_URL}/styles`, changefreq: 'monthly', priority: '0.5' },
  )

  // --- Категории и подкатегории ----------------------------------------------
  const categories = await db.category.findMany({ include: { subcategories: true } })
  for (const category of categories) {
    entries.push({
      loc: `${SITE_URL}/catalog/category/${category.slug}`,
      changefreq: 'daily',
      priority: '0.8',
      lastmod: category.updatedAt,
    })
    for (const sub of category.subcategories || []) {
      entries.push({
        loc: `${SITE_URL}/catalog/category/${category.slug}/${sub.slug}`,
        changefreq: 'daily',
        priority: '0.8',
        lastmod: sub.updatedAt,
      })
    }
  }

  // --- Все опубликованные товары: /product/{slug} -----------------------------
  const total = await db.product.count({ where: { published: true, decor: false } })
  console.log(`Товаров в sitemap: ${total} — все в одном файле`)

  const BATCH = 10_000
  let cursor = 0
  while (cursor < total) {
    const rows = await db.product.findMany({
      where: { published: true, decor: false },
      orderBy: { id: 'asc' },
      select: { slug: true, updatedAt: true },
      skip: cursor,
      take: BATCH,
    })
    if (!rows.length) break
    for (const row of rows) {
      entries.push({
        loc: `${SITE_URL}/product/${row.slug}`,
        changefreq: 'weekly',
        priority: '0.7',
        lastmod: row.updatedAt,
      })
    }
    cursor += rows.length
  }

  // --- Единый sitemap.xml ------------------------------------------------------
  const doc =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.map(urlEntry).join('\n') +
    `\n</urlset>\n`
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), doc)
  console.log(`sitemap.xml: ${entries.length} URL в одном файле (${SITE_URL})`)

  // --- robots.txt ---------------------------------------------------------------
  const robots = [
    '# robots.txt 13 STYLES — генерируется scripts/generate-sitemap.mjs',
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /api/',
    'Disallow: /account',
    'Disallow: /checkout',
    'Disallow: /payment',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n')
  fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), robots)
  console.log('robots.txt готов')

  await db.$disconnect()
}

main().catch(async (error) => {
  console.error('[sitemap] ошибка генерации:', error?.message || error)
  await db.$disconnect().catch(() => {})
  process.exit(1)
})
