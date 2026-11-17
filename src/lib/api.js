// Клиентский API-хелпер: fetch + JSON + заголовки админа и пользователя

const ADMIN_TOKEN_KEY = 'pixart-admin-token'
const USER_TOKEN_KEY = 'styles-user-token'

const readToken = (key) => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(key) || ''
}

const writeToken = (key, token) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, token)
}

const dropToken = (key) => {
  if (typeof window !== 'undefined') window.localStorage.removeItem(key)
}

const getAdminToken = () => readToken(ADMIN_TOKEN_KEY)
const setAdminToken = (token) => writeToken(ADMIN_TOKEN_KEY, token)
const clearAdminToken = () => dropToken(ADMIN_TOKEN_KEY)
const hasAdminToken = () => getAdminToken().length > 0

const getUserToken = () => readToken(USER_TOKEN_KEY)
const setUserToken = (token) => writeToken(USER_TOKEN_KEY, token)
const clearUserToken = () => dropToken(USER_TOKEN_KEY)
const hasUserToken = () => getUserToken().length > 0

const request = async (url, { method = 'GET', body, admin = false, user = false, signal } = {}) => {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (admin) headers['x-admin-key'] = getAdminToken()
  if (user) headers['x-user-key'] = getUserToken()

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data?.error || `Ошибка запроса (${response.status})`)
    error.status = response.status
    throw error
  }

  return data
}

const apiGet = (url, signal) => request(url, { signal })
const apiPost = (url, body) => request(url, { method: 'POST', body })
const apiPut = (url, body) => request(url, { method: 'PUT', body })
const apiDelete = (url) => request(url, { method: 'DELETE' })

const API = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  del: apiDelete,
  admin: {
    get: (url) => request(url, { admin: true }),
    post: (url, body) => request(url, { method: 'POST', body, admin: true }),
    put: (url, body) => request(url, { method: 'PUT', body, admin: true }),
    del: (url) => request(url, { method: 'DELETE', admin: true }),
    login: async (login, password) => {
      const data = await apiPost('/api/admin/auth', { login, password })
      setAdminToken(data.token)
      return data
    },
    setToken: setAdminToken,
    clearToken: clearAdminToken,
    hasToken: hasAdminToken,
  },
  user: {
    get: (url) => request(url, { user: true }),
    post: (url, body) => request(url, { method: 'POST', body, user: true }),
    register: async (payload) => {
      const data = await apiPost('/api/auth/register', payload)
      setUserToken(data.token)
      return data
    },
    login: async (payload) => {
      const data = await apiPost('/api/auth/login', payload)
      setUserToken(data.token)
      return data
    },
    setToken: setUserToken,
    clearToken: clearUserToken,
    hasToken: hasUserToken,
    token: getUserToken,
  },
}

export default API
