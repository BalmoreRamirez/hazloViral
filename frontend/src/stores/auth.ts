import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import { disconnectSocket } from '@/socket'

export interface AppUser {
  id: number; email: string; role: 'empresa' | 'influencer' | 'admin'
  stripe_customer_id: string | null; stripe_connect_id: string | null
  is_active: boolean; created_at: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('hv_token'))
  const user  = ref<AppUser | null>(
    JSON.parse(localStorage.getItem('hv_user') ?? 'null'),
  )

  const isAuthenticated = computed(() => !!token.value)
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

  function logout() {
    disconnectSocket()
    token.value = null
    user.value  = null
    localStorage.removeItem('hv_token')
    localStorage.removeItem('hv_user')
  }

  return { token, user, isAuthenticated, isEmpresa, isInfluencer, login, registerEmpresa, registerInfluencer, logout }
})
