'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Слайдер фото товара, листающийся при наведении мыши на карточку

const DEFAULT_INTERVAL = 850

const useHoverSlider = (images = [], intervalMs = DEFAULT_INTERVAL) => {
  const [index, setIndex] = useState(0)
  const [hovering, setHovering] = useState(false)
  const timerRef = useRef(null)

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    stopTimer()
    if ((images?.length || 0) > 1) {
      timerRef.current = setInterval(() => {
        setIndex((current) => (current + 1) % images.length)
      }, intervalMs)
    }
  }, [images, intervalMs, stopTimer])

  const handlers = {
    onMouseEnter: () => {
      setHovering(true)
      startTimer()
    },
    onMouseLeave: () => {
      setHovering(false)
      stopTimer()
      setIndex(0)
    },
  }

  useEffect(() => stopTimer, [stopTimer])

  const total = images?.length || 0

  return {
    index,
    hovering,
    handlers,
    setIndex,
    hasMultiple: total > 1,
    progress: hovering && total > 1 ? ((index + 1) / total) * 100 : 0,
  }
}

export default useHoverSlider
