// Синхронизация витрины с фото Garments2Look (запускается оркестром в фоне при каждом старте).
//  1) Если g2l-товаров в БД нет (чистый клон) — импортирует метаданные из data/garments2look/*.json.gz
//  2) Публикует товары, у которых фото есть в репозитории (git) или на диске,
//     и скрывает те, чьих фото нет нигде.
// Источник истины — GIT: фото товаров лежат в репозитории (public/products/g2l/**),
// поэтому витрина полностью собирается даже на машине с sparse-checkout, где файлы
// на диске не выгружены (браузер возьмёт их после полного checkout/деплоя).
// Запуск: node scripts/sync-garments2look.mjs

import fs from 'node:fs'
import path from 'node:path'
import { execSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const G2L_DIR = path.join(ROOT, 'public', 'products', 'g2l')
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

// Фото из git (работает без выгрузки файлов на диск)
const photosFromGit = () => {
  const bySlug = new Map()
  try {
    const output = execSync('git ls-files public/products/g2l', { maxBuffer: 512 * 1024 * 1024 }).toString()
    for (const line of output.split('\n')) {
      const file = line.trim()
      if (!file.endsWith('.webp')) continue
      const stem = file.replace(/^public\/products\/g2l\/(my|pv)\//, '').replace(/\.webp$/, '')
      const match = stem.match(/^(.*)-(\d+)$/)
      const slug = match ? match[1] : stem
      if (!bySlug.has(slug)) bySlug.set(slug, [])
      bySlug.get(slug).push({ idx: match ? Number(match[2]) : 1, path: `/${file.replace(/^public\//, '')}` })
    }
  } catch (error) {
    console.log('[g2l-sync] git ls-files недоступен:', error?.message || error)
  }
  return bySlug
}

// Плюс локальные файлы на диске (включая новые, ещё не закоммиченные)
const photosFromDisk = (into) => {
  if (!fs.existsSync(G2L_DIR)) return
  for (const sub of ['my', 'pv']) {
    const dir = path.join(G2L_DIR, sub)
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.webp')) continue
      const slug = f.replace(/-\d+\.webp$/, '')
      if (!into.has(slug)) into.set(slug, [])
      into.get(slug).push({ idx: Number(f.match(/-(\d+)\.webp$/)?.[1] || 1), path: `/products/g2l/${sub}/${f}` })
    }
  }
}

const main = async () => {
  const staged = await db.product.count({ where: { slug: { startsWith: 'g2l-' } } })
  if (staged === 0) {
    const metaDir = path.join(ROOT, 'data', 'garments2look')
    if (fs.existsSync(path.join(metaDir, 'mytheresa_image_v1.0_2512.json.gz'))) {
      console.log('[g2l-sync] в БД нет товаров Garments2Look — импортируем метаданные…')
      const res = spawnSync(process.execPath, [path.join(__dirname, 'import-garments2look.mjs')], { stdio: 'inherit' })
      if (res.status !== 0) {
        console.error('[g2l-sync] импорт метаданных завершился с ошибкой')
        return
      }
    } else {
      console.log('[g2l-sync] метаданные data/garments2look отсутствуют — пропуск')
      return
    }
  }

  const filesBySlug = photosFromGit()
  photosFromDisk(filesBySlug)
  for (const list of filesBySlug.values()) list.sort((a, b) => a.idx - b.idx)
  console.log(`[g2l-sync] фото в git+на диске: ${filesBySlug.size} товаров`)

  const g2lProducts = await db.product.findMany({
    where: { slug: { startsWith: 'g2l-' } },
    select: { id: true, slug: true, name: true, brand: true, images: true, imageAlts: true, published: true },
  })

  let publishedUp = 0
  let hiddenDown = 0
  const chunk = []
  const flush = async () => {
    if (!chunk.length) return
    await db.$transaction(chunk.splice(0, 40))
  }

  for (const p of g2lProducts) {
    const local = filesBySlug.get(p.slug)
    let images = []
    try { images = JSON.parse(p.images || '[]') } catch { images = [] }
    if (local && local.length) {
      const sorted = local.map((entry) => entry.path)
      const alts = Array.isArray(p.imageAlts) ? p.imageAlts : (() => { try { return JSON.parse(p.imageAlts || '[]') } catch { return [] } })()
      const needsAlts = alts.length < sorted.length
      const data = { images: JSON.stringify(sorted), published: true }
      // Alt-тексты SEO: дозаполняем, если их ещё нет (требование SEO проекта)
      if (needsAlts) {
        data.imageAlts = JSON.stringify(sorted.map((_, index) => alts[index] || altFor(p.brand, p.name, index)))
      }
      const imagesChanged = JSON.stringify(sorted) !== JSON.stringify(images.map((x) => String(x).replace(/^\/public\//, ''))) || JSON.stringify(images).includes('"/public/')
      if (imagesChanged || !p.published || needsAlts) {
        chunk.push(db.product.update({ where: { id: p.id }, data }))
      }
      if (chunk.length >= 40) await flush()
      publishedUp++
    } else if (p.published) {
      // фото отсутствуют и в git, и на диске — скрываем с витрины
      chunk.push(db.product.update({ where: { id: p.id }, data: { published: false, images: '[]' } }))
      if (chunk.length >= 40) await flush()
      hiddenDown++
    }
  }
  await flush()
  console.log(`[g2l-sync] готово: опубликовано с фото ${publishedUp}, скрыто без фото ${hiddenDown}`)
}

main()
  .catch((e) => { console.error('[g2l-sync] ошибка:', e?.message || e) })
  .finally(async () => { try { await db.$disconnect() } catch {} })
