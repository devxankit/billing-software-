import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch (_) {
    // ignore
  }
  return config
})

let refreshPromise = null

async function refreshAccessToken() {
  const isAdmin = window.location.pathname.startsWith('/admin')
  const endpoint = isAdmin ? '/admin/auth/refresh' : '/auth/refresh'

  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
  })
  
  const { data } = await client.post(endpoint, { refreshToken })
  return data
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status
    const originalRequest = error?.config
    if (!originalRequest) throw error

    if (status !== 401 || originalRequest._retry) {
      throw error
    }

    // Skip refresh for auth endpoints to preserve original validation messages
    if (originalRequest.url?.match(/\/auth\/(login|send-otp|verify-otp|refresh)/)) {
      throw error
    }

    // Only attempt refresh if a refresh token exists
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      throw error
    }

    originalRequest._retry = true

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null })
      }
      const refreshed = await refreshPromise
      if (refreshed?.accessToken) {
        localStorage.setItem('access_token', refreshed.accessToken)
        if (refreshed.refreshToken) {
          localStorage.setItem('refresh_token', refreshed.refreshToken)
        }
        const profile = refreshed.user || refreshed.admin
        if (profile) localStorage.setItem('billing_user', JSON.stringify(profile))
      }

      originalRequest.headers = originalRequest.headers || {}
      const token = localStorage.getItem('access_token')
      if (token) originalRequest.headers.Authorization = `Bearer ${token}`

      return apiClient(originalRequest)
    } catch (e) {
      // Force cleanup on refresh failure
      try {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('billing_user')
      } catch (_) {}

      const currentPath = window.location.pathname.replace(/\/$/, '') || '/'
      const isPublicAuthRoute = [
        '/login', '/admin', '/admin-login', '/otp', '/role-select', '/terms', '/privacy', '/support', '/view-bill', '/referral-setup'
      ].some(p => currentPath === p || currentPath.startsWith('/register') || currentPath.startsWith('/view-bill'))

      if (!isPublicAuthRoute && currentPath !== '/login') {
        window.location.href = '/login'
      }
      throw e
    }
  }
)

