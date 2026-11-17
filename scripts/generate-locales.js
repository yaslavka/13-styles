// Генератор локалей 13 STYLES: переводит EN-словарь на 35 европейских языков через LLM
// Запуск: bun scripts/generate-locales.js
// Результат: src/locales/<код>.json (отсутствующие ключи подставляются из EN на рантайме)

import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales')
const CONCURRENCY = 1

// 36 европейских языков: код + нативное имя (для переключателя) + полное имя для промпта
const LOCALES = [
  { code: 'de', native: 'Deutsch', name: 'German' },
  { code: 'fr', native: 'Français', name: 'French' },
  { code: 'es', native: 'Español', name: 'Spanish' },
  { code: 'it', native: 'Italiano', name: 'Italian' },
  { code: 'pt', native: 'Português', name: 'Portuguese' },
  { code: 'nl', native: 'Nederlands', name: 'Dutch' },
  { code: 'sv', native: 'Svenska', name: 'Swedish' },
  { code: 'no', native: 'Norsk', name: 'Norwegian' },
  { code: 'da', native: 'Dansk', name: 'Danish' },
  { code: 'fi', native: 'Suomi', name: 'Finnish' },
  { code: 'is', native: 'Íslenska', name: 'Icelandic' },
  { code: 'pl', native: 'Polski', name: 'Polish' },
  { code: 'cs', native: 'Čeština', name: 'Czech' },
  { code: 'sk', native: 'Slovenčina', name: 'Slovak' },
  { code: 'hu', native: 'Magyar', name: 'Hungarian' },
  { code: 'ro', native: 'Română', name: 'Romanian' },
  { code: 'bg', native: 'Български', name: 'Bulgarian' },
  { code: 'el', native: 'Ελληνικά', name: 'Greek' },
  { code: 'hr', native: 'Hrvatski', name: 'Croatian' },
  { code: 'sr', native: 'Српски', name: 'Serbian (Cyrillic or Latin script)' },
  { code: 'sl', native: 'Slovenščina', name: 'Slovenian' },
  { code: 'bs', native: 'Bosanski', name: 'Bosnian' },
  { code: 'mk', native: 'Македонски', name: 'Macedonian' },
  { code: 'sq', native: 'Shqip', name: 'Albanian' },
  { code: 'uk', native: 'Українська', name: 'Ukrainian' },
  { code: 'be', native: 'Беларуская', name: 'Belarusian' },
  { code: 'lt', native: 'Lietuvių', name: 'Lithuanian' },
  { code: 'lv', native: 'Latviešu', name: 'Latvian' },
  { code: 'et', native: 'Eesti', name: 'Estonian' },
  { code: 'ga', native: 'Gaeilge', name: 'Irish' },
  { code: 'mt', native: 'Malti', name: 'Maltese' },
  { code: 'ca', native: 'Català', name: 'Catalan' },
  { code: 'cy', native: 'Cymraeg', name: 'Welsh' },
  { code: 'eu', native: 'Euskara', name: 'Basque' },
  { code: 'gl', native: 'Galego', name: 'Galician' },
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
    // Спасательный парсер: тянем пары «ключ»: «значение» построчно,
    // когда модель вернула JSON с «сырыми» переносами внутри строк
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

const translateLocale = async (zai, source, locale) => {
  const prompt = [
    `Translate the values of this JSON UI dictionary into ${locale.name} (${locale.code}) for a playful European fashion e-commerce storefront called "13 STYLES".`,
    `Rules: keep a young, energetic, shopping-mall tone; keep placeholders exactly as-is ({count}, {total}, {amount}, {name}, {qty}, {size}, {code}, {year}, {number}, {sprite}, {colorway}); keep brand words "13 STYLES", "NEO" untranslated; adapt apostrophes naturally; do not translate the keys.`,
    `Return ONLY the resulting JSON object — no markdown, no explanations.`,
    `Dictionary:`,
    JSON.stringify(source),
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
      let missing = 0
      for (const key of Object.keys(source)) {
        if (typeof translated[key] === 'string' && translated[key].trim()) {
          merged[key] = translated[key]
        } else {
          merged[key] = source[key]
          missing += 1
        }
      }
      return { merged, missing }
    } catch (error) {
      console.warn(`[locales] ${locale.code} попытка ${attempt}: ${error?.message || error}`)
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt))
    }
  }
  return { merged: { ...source }, missing: Object.keys(source).length }
}

const makeWorker = async (zai, source, queue, status) => {
  while (true) {
    const locale = queue[status.cursor]
    status.cursor += 1
    if (!locale) return
    const target = path.join(LOCALES_DIR, `${locale.code}.json`)
    // Пропуск уже переведённых (файл существует и отличается от EN-источника)
    if (fs.existsSync(target)) {
      try {
        const existing = JSON.parse(fs.readFileSync(target, 'utf8'))
        const differs = Object.keys(source).some((key) => existing[key] !== source[key])
        if (differs) {
          status.done += 1
          console.log(`[locales] ${locale.code} уже переведён — пропуск (${status.done}/${LOCALES.length})`)
          continue
        }
      } catch {
        // повреждённый файл — переводим заново
      }
    }
    const { merged, missing } = await translateLocale(zai, source, locale)
    fs.writeFileSync(target, JSON.stringify(merged, null, 2), 'utf8')
    status.done += 1
    console.log(`[locales] ${locale.code} (${locale.native}) готов · ${status.done}/${LOCALES.length}${missing ? ` · дополнено из EN: ${missing}` : ''}`)
  }
}

const main = async () => {
  fs.mkdirSync(LOCALES_DIR, { recursive: true })
  const source = readSource()
  console.log(`[locales] ключей в EN: ${Object.keys(source).length}, языков к переводу: ${LOCALES.length}`)

  const zai = await ZAI.create()
  const queue = [...LOCALES]
  const status = { cursor: 0, done: 0 }
  const workers = Array.from({ length: CONCURRENCY }, () => makeWorker(zai, source, queue, status))
  await Promise.all(workers)
  console.log('[locales] все локали записаны')
}

main().catch((error) => {
  console.error('[locales] фатальная ошибка:', error)
  process.exit(1)
})
