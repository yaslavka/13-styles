// Разовая утилита: добавляет перевод новых платёжных ключей в 35 локалей.
// en.json уже содержит эталонные значения — LLM переводит их на остальные языки.
// Запуск: node scripts/translate-locale-keys.mjs
import fs from 'node:fs'
import path from 'node:path'
import ZAI from 'z-ai-web-dev-sdk'

const LOCALES_DIR = path.join(process.cwd(), 'src/locales')
const en = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'))

const KEYS = [
  'pay.cancel', 'pay.dokuButton', 'pay.dokuAmount', 'pay.dokuError', 'pay.secure',
  'result.notFound', 'result.confirmed', 'result.failedTitle', 'result.waiting',
  'result.order', 'result.noOrderCode', 'result.status', 'result.statusPaid',
  'result.statusExpired', 'result.statusCanceled', 'result.statusFailed',
  'result.statusPending', 'result.amount', 'result.toPay', 'result.rate',
  'result.merchant', 'result.method', 'result.invoice', 'result.retry',
  'result.toCatalog', 'result.myOrders',
]

const LANG_NAMES = {
  de: 'German', fr: 'French', es: 'Spanish', it: 'Italian', pt: 'Portuguese',
  nl: 'Dutch', sv: 'Swedish', no: 'Norwegian', da: 'Danish', fi: 'Finnish',
  is: 'Icelandic', pl: 'Polish', cs: 'Czech', sk: 'Slovak', hu: 'Hungarian',
  ro: 'Romanian', bg: 'Bulgarian', el: 'Greek', hr: 'Croatian', sr: 'Serbian',
  sl: 'Slovenian', bs: 'Bosnian', mk: 'Macedonian', sq: 'Albanian', uk: 'Ukrainian',
  be: 'Belarusian', lt: 'Lithuanian', lv: 'Latvian', et: 'Estonian', ga: 'Irish',
  mt: 'Maltese', ca: 'Catalan', cy: 'Welsh', eu: 'Basque', gl: 'Galician',
}

const buildPrompt = (lang, pairs) => {
  const lines = pairs.map(([key, value]) => `${key} = ${value}`).join('\n')
  return [
    `You localize an e-commerce storefront. Translate each UI string from English into ${lang}.`,
    'Rules:',
    '- Keep the exact "key = value" format, one line per key.',
    '- Keep {placeholders} exactly as-is (do not translate or remove them).',
    '- Keep "IDR", "EUR", "DOKU", "CODE" unchanged.',
    '- Keep "EUR→IDR" arrow notation unchanged.',
    '- Tone: short, friendly, checkout UI. Do not add quotes.',
    '', lines,
  ].join('\n')
}

const parseAnswer = (text) => {
  const map = {}
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    const idx = line.indexOf('=')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (key && value && KEYS.includes(key)) map[key] = value
  }
  return map
}

const main = async () => {
  const zai = await ZAI.create()
  const missingLocales = Object.keys(LANG_NAMES).filter((code) => {
    const file = path.join(LOCALES_DIR, `${code}.json`)
    if (!fs.existsSync(file)) return false
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    return KEYS.some((key) => data[key] === undefined)
  })
  console.log('Нужно перевести локали:', missingLocales.join(', '))

  for (const code of missingLocales) {
    const file = path.join(LOCALES_DIR, `${code}.json`)
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    const pairs = KEYS.filter((key) => data[key] === undefined).map((key) => [key, en[key]])

    let done = false
    for (let attempt = 1; attempt <= 3 && !done; attempt += 1) {
      try {
        const res = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are a professional UI localizer. Output strictly in the requested "key = value" format.' },
            { role: 'user', content: buildPrompt(LANG_NAMES[code], pairs) },
          ],
          temperature: 0.2,
        })
        const answer = res?.choices?.[0]?.message?.content || ''
        const translated = parseAnswer(answer)
        const hit = pairs.filter(([key]) => translated[key]).length
        if (hit >= pairs.length * 0.8) {
          for (const [key, value] of Object.entries(translated)) data[key] = value
          // Недостающие — английский fallback
          for (const [key] of pairs) if (data[key] === undefined) data[key] = en[key]
          fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
          console.log(`${code}: ${hit}/${pairs.length} ключей переведено`)
          done = true
        } else {
          console.log(`${code}: попытка ${attempt} — слишком мало ключей (${hit}/${pairs.length})`)
        }
      } catch (error) {
        console.log(`${code}: попытка ${attempt} ошибка:`, error?.message || error)
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
    }
    if (!done) {
      // Полный fallback английскими значениями, чтобы витрина нигде не сломалась
      for (const [key] of pairs) if (data[key] === undefined) data[key] = en[key]
      fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
      console.log(`${code}: LLM недоступна, вставлен английский fallback`)
    }
  }
  console.log('Готово')
}

main().catch((error) => { console.error('ФАТАЛЬНО:', error?.message || error); process.exit(1) })
