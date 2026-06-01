import { defineStore } from 'pinia'
import { ref } from 'vue'
import { empresaApi, influencerApi } from '@/api/profiles'
import { campaignsApi } from '@/api/campaigns'

export interface EmpresaProfile {
  id: number; user_id: number; nombre_comercial: string
  sitio_web: string; balance_creditos: number; umbral_creditos: number
}

export interface InfluencerProfile {
  id: number; user_id: number; nombre_artistico: string
  bio: string; ubicacion: string; tarifa_base: number
  disponibilidad: boolean; fecha_nacimiento: string
  tutor_nombre: string; tutor_email: string; tutor_autorizacion: boolean
  metrics: Metric[]
}

export interface Metric {
  id: number; influencer_id: number; red_social: string
  username: string; seguidores: number; engagement_rate: number; updated_at: string
}

export interface CampaignBrief {
  id: number; empresa_id: number; titulo_campana: string
  objetivo_principal: string; tono_de_voz: string
  puntos_clave_si: string; restricciones_no: string
  recursos_esteticos: string; created_at: string
}

export const useProfileStore = defineStore('profile', () => {
  const empresaProfile    = ref<EmpresaProfile | null>(null)
  const influencerProfile = ref<InfluencerProfile | null>(null)
  const metrics           = ref<Metric[]>([])
  const briefs            = ref<CampaignBrief[]>([])
  const loading           = ref(false)
  const saving            = ref(false)

  // ─── Empresa ────────────────────────────────────────────────────────────────
  async function loadEmpresaProfile() {
    loading.value = true
    try { empresaProfile.value = await empresaApi.getProfile() }
    finally { loading.value = false }
  }

  async function updateEmpresaProfile(data: Partial<EmpresaProfile>) {
    saving.value = true
    try { empresaProfile.value = await empresaApi.updateProfile(data) }
    finally { saving.value = false }
  }

  // ─── Influencer ──────────────────────────────────────────────────────────────
  async function loadInfluencerProfile() {
    loading.value = true
    try {
      influencerProfile.value = await influencerApi.getProfile()
      metrics.value = influencerProfile.value?.metrics ?? []
    } finally { loading.value = false }
  }

  async function updateInfluencerProfile(data: Partial<InfluencerProfile>) {
    saving.value = true
    try { influencerProfile.value = await influencerApi.updateProfile(data) }
    finally { saving.value = false }
  }

  // ─── Métricas ────────────────────────────────────────────────────────────────
  async function addMetric(data: { red_social: string; username: string; seguidores: number; engagement_rate: number }) {
    const m = await influencerApi.addMetric(data)
    metrics.value.push(m)
    return m
  }

  async function removeMetric(id: number) {
    await influencerApi.deleteMetric(id)
    metrics.value = metrics.value.filter(m => m.id !== id)
  }

  // ─── Campaign Briefs ─────────────────────────────────────────────────────────
  async function loadBriefs() {
    briefs.value = await campaignsApi.list()
  }

  async function createBrief(data: Partial<CampaignBrief>) {
    const b = await campaignsApi.create(data as any)
    briefs.value.unshift(b)
    return b
  }

  async function updateBrief(id: number, data: Partial<CampaignBrief>) {
    const b = await campaignsApi.update(id, data as any)
    const idx = briefs.value.findIndex(x => x.id === id)
    if (idx >= 0) briefs.value[idx] = b
    return b
  }

  async function removeBrief(id: number) {
    await campaignsApi.remove(id)
    briefs.value = briefs.value.filter(b => b.id !== id)
  }

  return {
    empresaProfile, influencerProfile, metrics, briefs, loading, saving,
    loadEmpresaProfile, updateEmpresaProfile,
    loadInfluencerProfile, updateInfluencerProfile,
    addMetric, removeMetric,
    loadBriefs, createBrief, updateBrief, removeBrief,
  }
})
