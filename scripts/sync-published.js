// Синхронизация публикации: товар 13 STYLES виден на сайте только когда
// его фирменное фото реально существует на диске.
// Запуск: bun scripts/sync-published.js
import fs from 'fs'
import path from 'path'
import { db } from '../src/lib/db.js'

const OUT_DIR = path.join(process.cwd(), 'public', 'products', 'catalog')

const main = async () => {
  // В БД images — JSON-строка, поэтому ищем через contains
  const catalog = await db.product.findMany({
    where: { images: { contains: '/products/catalog/' } },
    select: { id: true, slug: true, images: true, published: true },
  })
  let shown = 0
  let hidden = 0
  for (const product of catalog) {
    const images = JSON.parse(product.images)
    const exists = images.length > 0 && fs.existsSync(path.join(OUT_DIR, path.basename(images[0])))
    if (exists) {
      if (product.published) {
        shown += 1
      } else {
        await db.product.update({ where: { id: product.id }, data: { published: true } })
        shown += 1
      }
    } else {
      await db.product.update({ where: { id: product.id }, data: { published: false } })
      hidden += 1
    }
  }
  console.log(`[sync] на витрине ${shown}, временно скрыто ${hidden}`)
  await db.$disconnect()
}

main()
