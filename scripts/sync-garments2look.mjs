// Синхронизация витрины с фото Garments2Look на диске (запускается оркестром в фоне).
//  1) Если g2l-товаров в БД нет (чистый клон) — импортирует метаданные из data/garments2look/*.json.gz
//  2) Публикует товары, у которых фото реально лежит в public/products/g2l/**,
//     и скрывает те, чьи фото отсутствуют (на машине без скачанных фото витрина чистая).
// Запуск: node scripts/sync-garments2look.mjs

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const G2L_DIR = path.join(ROOT, 'public', 'products', 'g2l')
const db = new PrismaClient()

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

  // Какие фото реально есть на диске
  const filesBySlug = new Map()
  if (fs.existsSync(G2L_DIR)) {
    for (const sub of ['my', 'pv']) {
      const dir = path.join(G2L_DIR, sub)
      if (!fs.existsSync(dir)) continue
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.webp')) continue
        const slug = f.replace(/-\d+\.webp$/, '')
        if (!filesBySlug.has(slug)) filesBySlug.set(slug, [])
        filesBySlug.get(slug).push(`/products/g2l/${sub}/${f}`)
      }
    }
  }
  const withPhotos = filesBySlug.size
  console.log(`[g2l-sync] фото на диске: ${withPhotos} товаров`)

  const g2lProducts = await db.product.findMany({
    where: { slug: { startsWith: 'g2l-' } },
    select: { id: true, slug: true, images: true, published: true },
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
      const sorted = local.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      if (JSON.stringify(sorted) !== JSON.stringify(images) || !p.published) {
        chunk.push(db.product.update({ where: { id: p.id }, data: { images: JSON.stringify(sorted), published: true } }))
      }
      if (chunk.length >= 40) await flush()
      publishedUp++
    } else if (p.published) {
      // фото пропали (например, чистый клон без скачанных фото) — скрываем с витрины
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
