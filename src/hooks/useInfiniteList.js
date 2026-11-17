'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PAGE_SIZE } from '@/lib/constants'

// Переиспользуемый хук бесконечной подгрузки списков карточками (витрина + админка).
// Колбэки (buildUrl/fetcher/onError) читаются из ref — их идентичность не рвёт загрузку,
// а смена источника данных отслеживается по URL первой страницы (смена фильтров -> перезагрузка).

const useInfiniteList = ({ buildUrl, fetcher, pageSize = PAGE_SIZE, onError, dedupe = true }) => {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef(null)
  const versionRef = useRef(0)
  const latestRef = useRef({ buildUrl, fetcher, onError, dedupe })

  // Свежие колбэки без пересоздания fetchPage
  useEffect(() => {
    latestRef.current = { buildUrl, fetcher, onError, dedupe }
  }, [buildUrl, fetcher, onError, dedupe])

  // URL первой страницы как сигнатура источника данных (чистая функция, дешёвая)
  const firstUrl = buildUrl(0, pageSize)
  const [activeSource, setActiveSource] = useState(firstUrl)
  if (activeSource !== firstUrl) {
    setActiveSource(firstUrl)
  }

  const fetchPage = useCallback(
    async (offset) => {
      const version = versionRef.current + 1
      versionRef.current = version
      const { buildUrl: build, fetcher: load, onError: fail, dedupe: unique } = latestRef.current

      if (offset === 0) setLoading(true)
      else setLoadingMore(true)

      try {
        const data = await load(build(offset, pageSize))
        if (version !== versionRef.current) return null
        const fresh = data.items || []
        setItems((prev) => {
          if (offset === 0 || !unique) return fresh
          const known = new Set(prev.map((item) => item.id))
          return [...prev, ...fresh.filter((item) => !known.has(item.id))]
        })
        setTotal(data.total || 0)
        setHasMore(Boolean(data.hasMore))
        return data
      } catch (error) {
        if (version === versionRef.current && fail) fail(error)
        return null
      } finally {
        if (version === versionRef.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [pageSize]
  )

  // Первая страница при смене источника данных (фильтры, раздел админки)
  useEffect(() => {
    fetchPage(0)
  }, [fetchPage, activeSource])

  // Дозагрузка, когда маркер появляется у нижнего края экрана
  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchPage(items.length)
        }
      },
      { rootMargin: '420px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, items.length, fetchPage])

  const reload = useCallback(() => fetchPage(0), [fetchPage])

  return { items, total, hasMore, loading, loadingMore, sentinelRef, reload, setItems }
}

export default useInfiniteList
