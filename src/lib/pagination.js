import { PAGE_SIZE } from './constants'

// Общий парсер постраничной выдачи для списков админки и витрины (подгрузка по скроллу)

const MAX_LIMIT = 100

const parsePagination = (searchParams, { defaultLimit = PAGE_SIZE, maxLimit = MAX_LIMIT } = {}) => {
  const rawLimit = searchParams ? searchParams.get('limit') : null
  const rawOffset = searchParams ? searchParams.get('offset') : null

  const limitNum = Number(rawLimit)
  const offsetNum = Number(rawOffset)

  const limit =
    Number.isFinite(limitNum) && limitNum > 0 ? Math.min(maxLimit, Math.floor(limitNum)) : defaultLimit
  const offset = Number.isFinite(offsetNum) && offsetNum > 0 ? Math.floor(offsetNum) : 0

  return { limit, offset }
}

// Метаданные страницы для клиентской подгрузки по скроллу
const pageMeta = (items, total, offset) => ({
  total,
  hasMore: offset + items.length < total,
})

const PAGINATION = { parsePagination, pageMeta }

export default PAGINATION
