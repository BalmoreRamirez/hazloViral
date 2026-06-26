import { defineStore } from 'pinia'
import { ref } from 'vue'
import { adminApi } from '@/api/admin'

export interface GlobalSetting { key: string; value: string; description: string }
export interface AdminStats { users: number; empresas: number; influencers: number; contratos: number; incumplimientos: number }
export interface AdminIncumplimiento {
  id: number; status: string; motivo_incumplimiento: string
  resolucion_admin: string | null; resuelto_por_admin: boolean
  monto_total: number; created_at: string; updated_at: string
  empresa: { nombre_comercial: string } | null
  influencer: { nombre_artistico: string } | null
}
export interface AdminUser { id: number; email: string; role: string; is_active: boolean; created_at: string; profile: any }

export const useAdminStore = defineStore('admin', () => {
  const stats            = ref<AdminStats | null>(null)
  const settings         = ref<GlobalSetting[]>([])
  const users            = ref<AdminUser[]>([])
  const incumplimientos  = ref<AdminIncumplimiento[]>([])
  const loading          = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const [s, st, u, inc] = await Promise.all([
        adminApi.getStats(),
        adminApi.getSettings(),
        adminApi.getUsers(),
        adminApi.getIncumplimientos(),
      ])
      stats.value           = s
      settings.value        = st
      users.value           = u
      incumplimientos.value = inc
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

  async function toggleUserStatus(id: number, is_active: boolean) {
    const updated = await adminApi.setUserStatus(id, is_active)
    const idx = users.value.findIndex((u) => u.id === id)
    if (idx >= 0 && users.value[idx]) users.value[idx]!.is_active = updated.is_active
    return updated
  }

  async function resolveIncumplimiento(id: number, resolucion: string) {
    const updated = await adminApi.resolveIncumplimiento(id, resolucion)
    const idx = incumplimientos.value.findIndex(i => i.id === id)
    if (idx >= 0) incumplimientos.value[idx] = updated
    if (stats.value && stats.value.incumplimientos > 0) stats.value.incumplimientos--
    return updated
  }

  return { stats, settings, users, incumplimientos, loading, fetchAll, updateSetting, toggleUserStatus, resolveIncumplimiento }
})
