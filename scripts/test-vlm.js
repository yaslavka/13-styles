// Тест скорости и точности VLM-фильтра людей
// Запуск: bun scripts/test-vlm.js
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import ZAI from 'z-ai-web-dev-sdk'

const SRC = path.join(process.cwd(), 'data', 'sources')
const plan = JSON.parse(fs.readFileSync('data/import-plan.json', 'utf-8'))

const PROMPT = `You are filtering fashion e-commerce product photos. Look at ALL provided photos of ONE product.
Decide if ANY photo shows a human being or real human body parts: a model wearing the item, a face, head, hair, hands, arms, legs, FEET (even feet wearing shoes/sandals/anklets), neck, torso skin, or a partial human silhouette.
Note: empty ghost-mannequin shots and plain product-only shots are CLEAN. Plastic/jewelry display busts without human skin are CLEAN.
Answer with exactly one word: PERSON or CLEAN.`

const zai = await ZAI.create()
const withSources = plan.products.filter((p) => p.images.some((_, i) => fs.existsSync(path.join(SRC, `${p.slug}-${i + 1}.webp`)))).slice(0, 12)

const verdict = async (product) => {
  const content = [{ type: 'text', text: PROMPT }]
  for (let i = 0; i < product.images.length; i += 1) {
    const file = path.join(SRC, `${product.slug}-${i + 1}.webp`)
    if (!fs.existsSync(file)) continue
    const small = await sharp(file).resize(384).webp({ quality: 70 }).toBuffer()
    content.push({ type: 'image_url', image_url: { url: `data:image/webp;base64,${small.toString('base64')}` } })
  }
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const t0 = Date.now()
      const res = await zai.chat.completions.createVision({
        messages: [{ role: 'user', content }],
        thinking: { type: 'disabled' },
      })
      const answer = (res.choices[0]?.message?.content || '').toUpperCase()
      return { slug: product.slug, answer: answer.includes('PERSON') ? 'PERSON' : 'CLEAN', raw: answer.slice(0, 40), ms: Date.now() - t0 }
    } catch (error) {
      if (attempt === 5) return { slug: product.slug, answer: 'FAIL', raw: error.message.slice(0, 40), ms: 0 }
      await new Promise((r) => setTimeout(r, 2500 * attempt))
    }
  }
}

const t0 = Date.now()
const results = []
const queue = [...withSources]
const workers = Array.from({ length: 3 }, async () => {
  while (queue.length > 0) {
    const product = queue.shift()
    const result = await verdict(product)
    results.push(result)
    console.log(`${result.answer.padEnd(6)} ${String(result.ms).padStart(6)}ms  ${result.slug}`)
  }
})
await Promise.all(workers)
for (const r of results) console.log(`${r.answer.padEnd(6)} ${String(r.ms).padStart(6)}ms  ${r.slug}  | ${r.raw}`)
console.log(`итого: ${results.length} товаров за ${((Date.now() - t0) / 1000).toFixed(1)}s, concurrency=12`)
