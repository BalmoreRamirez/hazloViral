import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3009/api',
  headers: { 'Content-Type': 'application/json' },
})

// Inyectar JWT en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hv_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirigir a /login si el token expira
api.interceptors.response.use(
  (r) => r,
  (err) => {
    // No redirigir si el 401 viene de los endpoints de auth (login incorrecto)
    const isAuthEndpoint = (err.config?.url as string)?.includes('/auth/')
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('hv_token')
      localStorage.removeItem('hv_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)
