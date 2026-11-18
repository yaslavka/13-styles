// Кэш-слой с автоопределением бэкенда:
//  - Redis, если задан REDIS_URL (клиент ioredis подтягивается динамически и опционально)
//  - Локальная память (fallback, используется по умолчанию — без внешних зависимостей)

const memory = new Map()
const REDIS_PREFIX = 'styles:cache:'
let redisClient = null
let redisMode = false
let redisAttempted = false

const now = () => Date.now()

const initRedis = async () => {
  if (redisAttempted || !process.env.REDIS_URL) return
  redisAttempted = true
  try {
    // webpackIgnore: ioredis — опциональный рантайм-плагин, ставится отдельно при переходе на Redis
    const redisModule = await import(/* webpackIgnore: true */ 'ioredis')
    redisClient = new redisModule.default(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    })
    await redisClient.connect()
    redisMode = true
    console.log('[cache] redis подключён:', process.env.REDIS_URL)
  } catch (error) {
    redisClient = null
    redisMode = false
    console.warn('[cache] redis недоступен, работаем в памяти:', error?.message || error)
  }
}

const memoryGet = (key) => {
  const entry = memory.get(key)
  if (!entry) return null
  if (entry.expires && entry.expires < now()) {
    memory.delete(key)
    return null
  }
  return entry.value
}

const memorySet = (key, value, ttlMs) => {
  memory.set(key, { value, expires: ttlMs > 0 ? now() + ttlMs : 0 })
  if (memory.size > 500) {
    const oldest = memory.keys().next().value
    memory.delete(oldest)
  }
}

const cacheGet = async (key) => {
  await initRedis()
  if (redisMode) {
    try {
      const raw = await redisClient.get(`${REDIS_PREFIX}${key}`)
      return raw ? JSON.parse(raw) : null
    } catch (error) {
      console.warn('[cache] redis get error:', error?.message || error)
    }
  }
  return memoryGet(key)
}

const cacheSet = async (key, value, ttlMs = 30000) => {
  if (redisMode) {
    try {
      await redisClient.set(`${REDIS_PREFIX}${key}`, JSON.stringify(value), 'PX', Math.max(1000, ttlMs))
    } catch (error) {
      console.warn('[cache] redis set error:', error?.message || error)
    }
  }
  memorySet(key, value, ttlMs)
}

// Возвращает закэшированное значение либо вычисляет producer() и сохраняет результат
const cacheWrap = async (key, ttlMs, producer) => {
  const hit = await cacheGet(key)
  if (hit !== null && hit !== undefined) return hit
  const fresh = await producer()
  await cacheSet(key, fresh, ttlMs)
  return fresh
}

// Сброс ключей по префиксу (после мутаций каталога в админке)
const cacheInvalidatePrefix = async (prefix) => {
  memory.forEach((entry, key) => {
    if (key.startsWith(prefix)) memory.delete(key)
  })
  if (redisMode) {
    try {
      const keys = await redisClient.keys(`${REDIS_PREFIX}${prefix}*`)
      if (keys && keys.length > 0) await redisClient.del(keys)
    } catch (error) {
      console.warn('[cache] redis invalidate error:', error?.message || error)
    }
  }
}

const cacheMode = () => (redisMode ? 'redis' : 'memory')

const CACHE = { get: cacheGet, set: cacheSet, wrap: cacheWrap, invalidatePrefix: cacheInvalidatePrefix, mode: cacheMode }

export default CACHE
