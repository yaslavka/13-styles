// Клиентский API-хелпер: fetch + JSON + заголовок админа

const ADMIN_TOKEN_KEY = 'pixart-admin-token'

const getAdminToken = () => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) || ''
}

const setAdminToken = (token) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

const clearAdminToken = () => {
  if (typeof window !== 'undefined') window.localStorage.removeItem(ADMIN_TOKEN_KEY)
}

const hasAdminToken = () => getAdminToken().length > 0

const request = async (url, { method = 'GET', body, admin = false, signal } = {}) => {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (admin) headers['x-admin-key'] = getAdminToken()

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
    login: async (password) => {
      const data = await apiPost('/api/admin/auth', { password })
      setAdminToken(data.token)
      return data
    },
    setToken: setAdminToken,
    clearToken: clearAdminToken,
    hasToken: hasAdminToken,
  },
}

export default API
