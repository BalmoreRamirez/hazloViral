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
  // Only a non-secret presence marker is persisted; the JWT lives in an HttpOnly cookie.
  localStorage.removeItem('hv_token')
  const token = ref<string | null>(localStorage.getItem('hv_session_present') === '1' ? 'cookie-session' : null)
  let sessionValidationSequence = 0
  // Role and identity are always restored from the authenticated API, never localStorage.
  const user = ref<AppUser | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isEmpresa       = computed(() => user.value?.role === 'empresa')
  const isInfluencer    = computed(() => user.value?.role === 'influencer')

  function setSession(data: { user: AppUser }) {
    sessionValidationSequence += 1
    token.value = 'cookie-session'
    user.value  = data.user
    localStorage.setItem('hv_session_present', '1')
  }

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password)
    setSession({ user: res.user })
    return res
  }

  async function registerEmpresa(data: Parameters<typeof authApi.registerEmpresa>[0]) {
    return authApi.registerEmpresa(data)
  }

  async function registerInfluencer(data: Parameters<typeof authApi.registerInfluencer>[0]) {
    return authApi.registerInfluencer(data)
  }

  async function validateSession(): Promise<boolean> {
    if (!token.value) return false
    const validationSequence = ++sessionValidationSequence
    try {
      const fresh = await authApi.me()
      if (validationSequence !== sessionValidationSequence) return false
      if (!fresh.is_active || !['empresa', 'influencer', 'admin'].includes(fresh.role)) {
        logout()
        return false
      }
      token.value = 'cookie-session'
      user.value = fresh
      localStorage.setItem('hv_session_present', '1')
      return true
    } catch (error: any) {
      if (validationSequence !== sessionValidationSequence) return false
      token.value = null
      user.value = null
      localStorage.removeItem('hv_session_present')
      localStorage.removeItem('hv_user')
      if (error.response?.status === 401 || error.response?.status === 403) logout()
      return false
    }
  }

  async function refreshUser() {
    await validateSession()
  }

  function logout(revokeServer = false) {
    sessionValidationSequence += 1
    if (revokeServer && token.value) void authApi.logout().catch(() => undefined)
    disconnectSocket()
    token.value = null
    user.value  = null
    localStorage.removeItem('hv_session_present')
    localStorage.removeItem('hv_user')
  }

  return { token, user, isAuthenticated, isEmpresa, isInfluencer, login, registerEmpresa, registerInfluencer, logout, refreshUser, validateSession }
})
