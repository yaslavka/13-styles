// i18n 13 STYLES: 36 европейских языков, витрина без русского.
// Русский остаётся только в админ-панели (строки захардкожены там напрямую).

import { DEFAULT_LOCALE } from './constants'
import en from '@/locales/en.json'
import de from '@/locales/de.json'
import fr from '@/locales/fr.json'
import es from '@/locales/es.json'
import it from '@/locales/it.json'
import pt from '@/locales/pt.json'
import nl from '@/locales/nl.json'
import sv from '@/locales/sv.json'
import no from '@/locales/no.json'
import da from '@/locales/da.json'
import fi from '@/locales/fi.json'
import is from '@/locales/is.json'
import pl from '@/locales/pl.json'
import cs from '@/locales/cs.json'
import sk from '@/locales/sk.json'
import hu from '@/locales/hu.json'
import ro from '@/locales/ro.json'
import bg from '@/locales/bg.json'
import el from '@/locales/el.json'
import hr from '@/locales/hr.json'
import sr from '@/locales/sr.json'
import sl from '@/locales/sl.json'
import bs from '@/locales/bs.json'
import mk from '@/locales/mk.json'
import sq from '@/locales/sq.json'
import uk from '@/locales/uk.json'
import be from '@/locales/be.json'
import lt from '@/locales/lt.json'
import lv from '@/locales/lv.json'
import et from '@/locales/et.json'
import ga from '@/locales/ga.json'
import mt from '@/locales/mt.json'
import ca from '@/locales/ca.json'
import cy from '@/locales/cy.json'
import eu from '@/locales/eu.json'
import gl from '@/locales/gl.json'

// Порядок в переключателе: en первым, далее алфавит
export const LOCALES = [
  { code: 'en', native: 'English', name: 'English' },
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
  { code: 'sr', native: 'Српски', name: 'Serbian' },
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

const DICTS = {
  en, de, fr, es, it, pt, nl, sv, no, da, fi, is,
  pl, cs, sk, hu, ro, bg, el, hr, sr, sl, bs, mk,
  sq, uk, be, lt, lv, et, ga, mt, ca, cy, eu, gl,
}

export const LOCALE_CODES = LOCALES.map((locale) => locale.code)

// Детект начальной локали из настроек браузера (только европейский список)
const detectLocale = () => {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE
  const candidates = navigator.languages || [navigator.language || '']
  for (const raw of candidates) {
    const base = String(raw).toLowerCase().split('-')[0]
    if (LOCALE_CODES.includes(base)) return base
  }
  return DEFAULT_LOCALE
}

export { DICTS, detectLocale, DEFAULT_LOCALE }
