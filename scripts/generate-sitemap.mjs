// Генератор статических sitemap-файлов для SEO 13 STYLES.
//
// Требование проекта: sitemap.xml и robots.txt лежат в public/ и доступны
// роботам по стандартным путям /sitemap.xml и /robots.txt без обработки Next.js.
//
// Каталог > 127 000 опубликованных товаров, а один sitemap-файл принимает
// максимум 50 000 URL — поэтому создаётся ИНДЕКС:
//   public/sitemap.xml              — индекс, перечисляет файлы ниже
//   public/sitemap/pages.xml        — главная, каталог, стили
//   public/sitemap/categories.xml   — категории и подкатегории
//   public/sitemap/products-N.xml   — все опубликованные товары (чанки по 45k)
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
const SITEMAP_DIR = path.join(PUBLIC_DIR, 'sitemap')
const PER_FILE = 45_000

const urlFlagIndex = process.argv.indexOf('--url')
const SITE_URL = String(
  (urlFlagIndex !== -1 && process.argv[urlFlagIndex + 1]) ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'http://13-style.com'
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

const urlsetDoc = (entries) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`

const writeSitemapFile = (name, entries) => {
  const file = path.join(SITEMAP_DIR, name)
  fs.writeFileSync(file, urlsetDoc(entries))
  console.log(`  sitemap/${name}: ${entries.length} URL`)
  return { name, count: entries.length, lastmod: new Date().toISOString() }
}

const main = async () => {
  fs.mkdirSync(SITEMAP_DIR, { recursive: true })
  // Старые чанки удаляем: после пересборки их список мог измениться
  for (const entry of fs.readdirSync(SITEMAP_DIR)) fs.rmSync(path.join(SITEMAP_DIR, entry))

  const indexFiles = []

  // --- Страницы витрины ------------------------------------------------------
  const pages = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/catalog`, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE_URL}/styles`, changefreq: 'monthly', priority: '0.5' },
  ]
  indexFiles.push(writeSitemapFile('pages.xml', pages.map(urlEntry)))

  // --- Категории и подкатегории ----------------------------------------------
  const categories = await db.category.findMany({ include: { subcategories: true } })
  const categoryEntries = []
  for (const category of categories) {
    categoryEntries.push({
      loc: `${SITE_URL}/catalog/category/${category.slug}`,
      changefreq: 'daily',
      priority: '0.8',
      lastmod: category.updatedAt,
    })
    for (const sub of category.subcategories || []) {
      categoryEntries.push({
        loc: `${SITE_URL}/catalog/category/${category.slug}/${sub.slug}`,
        changefreq: 'daily',
        priority: '0.8',
        lastmod: sub.updatedAt,
      })
    }
  }
  indexFiles.push(writeSitemapFile('categories.xml', categoryEntries.map(urlEntry)))

  // --- Товары: каждый опубликованный товар = маршрут /product/{slug} ----------
  const total = await db.product.count({ where: { published: true, decor: false } })
  console.log(`Товаров в sitemap: ${total}`)

  const BATCH = 10_000
  let cursor = 0
  let chunk = []
  let chunkIndex = 1
  const flushChunk = async (force = false) => {
    if (chunk.length >= PER_FILE || (force && chunk.length > 0)) {
      const entries = chunk.map(urlEntry)
      indexFiles.push(writeSitemapFile(`products-${chunkIndex}.xml`, entries))
      chunk = []
      chunkIndex += 1
    }
    if (force) return
  }

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
      chunk.push({
        loc: `${SITE_URL}/product/${row.slug}`,
        changefreq: 'weekly',
        priority: '0.7',
        lastmod: row.updatedAt,
      })
    }
    cursor += rows.length
    await flushChunk()
  }
  await flushChunk(true)

  // --- Индекс sitemap.xml ------------------------------------------------------
  const indexDoc =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    indexFiles
      .map(
        (file) =>
          `  <sitemap>\n    <loc>${SITE_URL}/sitemap/${file.name}</loc>\n    <lastmod>${xmlDate(file.lastmod)}</lastmod>\n  </sitemap>`
      )
      .join('\n') +
    `\n</sitemapindex>\n`
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), indexDoc)
  console.log(`sitemap.xml: индекс из ${indexFiles.length} файлов (${SITE_URL})`)

  // --- robots.txt в public/ ----------------------------------------------------
  const robots = [
    '# robots.txt 13 STYLES — генерируется scripts/generate-sitemap.mjs',
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /api/',
    'Disallow: /account',
    'Disallow: /checkout',
    '',
    'User-agent: googlebot',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /api/',
    'Disallow: /account',
    'Disallow: /checkout',
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
