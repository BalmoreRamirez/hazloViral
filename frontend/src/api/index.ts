import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3009/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Limpiar la sesión local si el servidor la invalida o vence.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    // No redirigir si el 401 viene de los endpoints de auth (login incorrecto)
    const isAuthEndpoint = (err.config?.url as string)?.includes('/auth/')
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('hv_session_present')
      localStorage.removeItem('hv_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)
