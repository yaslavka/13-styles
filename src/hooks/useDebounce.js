'use client'

import { useEffect, useState } from 'react'

// Отложенное обновление значения (для поиска в реальном времени)

const useDebounce = (value, delayMs = 350) => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

export default useDebounce
