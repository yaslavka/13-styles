'use client'

import { useCallback } from 'react'
import useShop from '@/store/useShop'
import { DICTS } from '@/lib/i18n'

// Хук перевода витрины: t('key', { vars }) с фолбэком на английский

const useT = () => {
  const locale = useShop((state) => state.locale)

  return useCallback(
    (key, vars) => {
      const dict = DICTS[locale] || DICTS.en
      let text = dict[key] ?? DICTS.en[key] ?? key
      if (vars) {
        Object.entries(vars).forEach(([name, value]) => {
          text = text.split(`{${name}}`).join(String(value))
        })
      }
      return text
    },
    [locale]
  )
}

export default useT
