import { defineStore } from 'pinia'
import { ref } from 'vue'
import { adminApi } from '@/api/admin'

export interface GlobalSetting { key: string; value: string; description: string }
export interface AdminStats { users: number; empresas: number; influencers: number; contratos: number; disputas: number }
export interface AdminUser { id: number; email: string; role: string; is_active: boolean; created_at: string; profile: any }
export interface Dispute { id: number; chat_id: number; monto_total: number; comision_plataforma: number; status: string; empresa: any; influencer: any; created_at: string }

export const useAdminStore = defineStore('admin', () => {
  const stats    = ref<AdminStats | null>(null)
  const settings = ref<GlobalSetting[]>([])
  const disputes = ref<Dispute[]>([])
  const users    = ref<AdminUser[]>([])
  const loading  = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const [s, st, d, u] = await Promise.all([
        adminApi.getStats(),
        adminApi.getSettings(),
        adminApi.getDisputes(),
        adminApi.getUsers(),
      ])
      stats.value    = s
      settings.value = st
      disputes.value = d
      users.value    = u
    } finally {
      loading.value = false
    }
  }

  async function updateSetting(key: string, value: string) {
    const updated = await adminApi.updateSetting(key, value)
    const idx = settings.value.findIndex((s) => s.key === key)
    if (idx >= 0) settings.value[idx] = updated
    return updated
  }

  async function resolveDispute(id: number, decision: 'empresa' | 'influencer' | 'split', nota: string) {
    const updated = await adminApi.resolveDispute(id, decision, nota)
    disputes.value = disputes.value.filter((d) => d.id !== id)
    if (stats.value) stats.value.disputas = Math.max(0, stats.value.disputas - 1)
    return updated
  }

  async function toggleUserStatus(id: number, is_active: boolean) {
    const updated = await adminApi.setUserStatus(id, is_active)
    const idx = users.value.findIndex((u) => u.id === id)
    if (idx >= 0 && users.value[idx]) users.value[idx]!.is_active = updated.is_active
    return updated
  }

  return { stats, settings, disputes, users, loading, fetchAll, updateSetting, resolveDispute, toggleUserStatus }
})
