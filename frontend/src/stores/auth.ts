import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import { disconnectSocket } from '@/socket'

export interface AppUser {
  id: number; email: string; role: 'empresa' | 'influencer' | 'admin'
  avatar_url: string | null
  stripe_customer_id: string | null; stripe_connect_id: string | null
  is_active: boolean; is_email_verified: boolean; created_at: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('hv_token'))
  // Role and identity are always restored from the authenticated API, never localStorage.
  const user = ref<AppUser | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isEmpresa       = computed(() => user.value?.role === 'empresa')
  const isInfluencer    = computed(() => user.value?.role === 'influencer')

  function setSession(data: { token: string; user: AppUser }) {
    token.value = data.token
    user.value  = data.user
    localStorage.setItem('hv_token', data.token)
    localStorage.setItem('hv_user', JSON.stringify(data.user))
  }

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password)
    setSession({ token: res.token, user: res.user })
    return res
  }

  async function registerEmpresa(data: Parameters<typeof authApi.registerEmpresa>[0]) {
    const res = await authApi.registerEmpresa(data)
    setSession({ token: res.token, user: res.user })
    return res
  }

  async function registerInfluencer(data: Parameters<typeof authApi.registerInfluencer>[0]) {
    const res = await authApi.registerInfluencer(data)
    setSession({ token: res.token, user: res.user })
    return res
  }

  async function validateSession(): Promise<boolean> {
    const sessionToken = token.value
    if (!sessionToken) return false
    try {
      const fresh = await authApi.me()
      if (token.value !== sessionToken) return false
      if (!fresh.is_active || !['empresa', 'influencer', 'admin'].includes(fresh.role)) {
        logout()
        return false
      }
      user.value = fresh
      localStorage.setItem('hv_user', JSON.stringify(fresh))
      return true
    } catch (error: any) {
      if (token.value !== sessionToken) return false
      user.value = null
      localStorage.removeItem('hv_user')
      if (error.response?.status === 401 || error.response?.status === 403) logout()
      return false
    }
  }

  async function refreshUser() {
    await validateSession()
  }

  function logout() {
    disconnectSocket()
    token.value = null
    user.value  = null
    localStorage.removeItem('hv_token')
    localStorage.removeItem('hv_user')
  }

  return { token, user, isAuthenticated, isEmpresa, isInfluencer, login, registerEmpresa, registerInfluencer, logout, refreshUser, validateSession }
})
