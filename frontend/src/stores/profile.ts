import { defineStore } from 'pinia'
import { ref } from 'vue'
import { empresaApi, influencerApi } from '@/api/profiles'
import { campaignsApi } from '@/api/campaigns'

export interface EmpresaProfile {
  id: number; user_id: number; nombre_comercial: string
  sitio_web: string; balance_creditos: number; umbral_creditos: number
  representante_nombre: string | null
  representante_tipo_identificacion: string | null
  representante_numero_identificacion: string | null
  rubro: string | null
}

export interface InfluencerProfile {
  id: number; user_id: number; username: string | null; nombre_artistico: string
  bio: string; ubicacion: string; tarifa_base: number
  disponibilidad: boolean; fecha_nacimiento: string
  tipo_identificacion: string | null
  numero_identificacion: string | null
  banco_nombre: string | null
  banco_cuenta_numero: string | null
  banco_cuenta_tipo: string | null
  tutor_nombre: string; tutor_email: string; tutor_autorizacion: boolean
  rubro: string | null
  metrics: Metric[]
  is_verified?: boolean
  user?: { avatar_url: string | null; is_email_verified: boolean }
}

export interface Metric {
  id: number; influencer_id: number; red_social: string
  username: string; seguidores: number; engagement_rate: number
  is_verified: boolean; verified_at: string | null; updated_at: string
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
  async function addMetric(data: { red_social: string; username: string }) {
    const m = await influencerApi.addMetric(data)
    metrics.value.push(m)
    return m
  }

  async function removeMetric(id: number) {
    await influencerApi.deleteMetric(id)
    metrics.value = metrics.value.filter(m => m.id !== id)
  }

  async function verifyMetric(id: number) {
    const updated = await influencerApi.verifyMetric(id)
    const idx = metrics.value.findIndex(m => m.id === id)
    if (idx >= 0) metrics.value[idx] = updated
    return updated
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
    addMetric, removeMetric, verifyMetric,
    loadBriefs, createBrief, updateBrief, removeBrief,
  }
})
