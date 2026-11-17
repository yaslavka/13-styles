// Инкрементальное обновление локалей 13 STYLES:
// переводит ТОЛЬКО недостающие ключи EN-словаря на 35 европейских языков через LLM.
// Запуск: bun scripts/update-locales.js

import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales')
const CONCURRENCY = 2

const LOCALES = [
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'is', name: 'Icelandic' },
  { code: 'pl', name: 'Polish' },
  { code: 'cs', name: 'Czech' },
  { code: 'sk', name: 'Slovak' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'el', name: 'Greek' },
  { code: 'hr', name: 'Croatian' },
  { code: 'sr', name: 'Serbian (Cyrillic script)' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'sq', name: 'Albanian' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'be', name: 'Belarusian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'et', name: 'Estonian' },
  { code: 'ga', name: 'Irish' },
  { code: 'mt', name: 'Maltese' },
  { code: 'ca', name: 'Catalan' },
  { code: 'cy', name: 'Welsh' },
  { code: 'eu', name: 'Basque' },
  { code: 'gl', name: 'Galician' },
]

const readSource = () => JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'))

const extractJson = (text) => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('JSON not found in response')
  const jsonSlice = text.slice(start, end + 1)
  try {
    return JSON.parse(jsonSlice)
  } catch {
    const result = {}
    const pairRegex = /"([\w.\-]+)"\s*:\s*"((?:[^"\\]|\\.)*)"\s*[,\n\r}]?/g
    let match = pairRegex.exec(jsonSlice)
    while (match) {
      result[match[1]] = match[2]
      match = pairRegex.exec(jsonSlice)
    }
    if (Object.keys(result).length === 0) throw new Error('No key-value pairs recovered')
    return result
  }
}

const translateMissing = async (zai, locale, missing) => {
  const prompt = [
    `Translate the values of this JSON UI dictionary into ${locale.name} (${locale.code}) for a playful European fashion e-commerce storefront called "13 STYLES".`,
    `Rules: keep a young, energetic, shopping-mall tone; keep placeholders exactly as-is ({count}, {total}, {amount}, {name}, {qty}, {size}, {code}, {year}, {number}, {sprite}, {colorway}); keep brand words "13 STYLES", "NEO" untranslated; adapt apostrophes naturally; do not translate the keys.`,
    `Return ONLY the resulting JSON object — no markdown, no explanations.`,
    `Dictionary:`,
    JSON.stringify(missing),
  ].join('\n')

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const completion = await zai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        thinking: { type: 'disabled' },
      })
      const content = completion?.choices?.[0]?.message?.content || ''
      const translated = extractJson(content)
      const merged = {}
      let missed = 0
      for (const key of Object.keys(missing)) {
        if (typeof translated[key] === 'string' && translated[key].trim()) merged[key] = translated[key]
        else {
          merged[key] = missing[key]
          missed += 1
        }
      }
      return { merged, missed }
    } catch (error) {
      console.warn(`[locales] ${locale.code} попытка ${attempt}: ${error?.message || error}`)
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt))
    }
  }
  return { merged: { ...missing }, missed: Object.keys(missing).length }
}

const main = async () => {
  const source = readSource()
  const sourceKeys = Object.keys(source)
  console.log(`[locales] ключей в EN: ${sourceKeys.length}`)

  const zai = await ZAI.create()

  for (const locale of LOCALES) {
    const target = path.join(LOCALES_DIR, `${locale.code}.json`)
    let dict = {}
    try {
      dict = JSON.parse(fs.readFileSync(target, 'utf8'))
    } catch {
      dict = {}
    }

    const missing = {}
    for (const key of sourceKeys) {
      if (typeof dict[key] !== 'string' || !dict[key].trim()) missing[key] = source[key]
    }

    if (Object.keys(missing).length === 0) {
      console.log(`[locales] ${locale.code}: всё переведено — пропуск`)
      continue
    }

    console.log(`[locales] ${locale.code}: ${Object.keys(missing).length} ключей к переводу`)
    const { merged, missed } = await translateMissing(zai, locale, missing)
    const next = { ...dict, ...merged }
    fs.writeFileSync(target, JSON.stringify(next, null, 2), 'utf8')
    console.log(`[locales] ${locale.code} готов${missed ? ` · дополнено из EN: ${missed}` : ''}`)
  }

  console.log('[locales] все локали обновлены')
}

main().catch((error) => {
  console.error('[locales] фатальная ошибка:', error)
  process.exit(1)
})
