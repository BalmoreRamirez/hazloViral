import { api } from './index'

// ─── Empresa ─────────────────────────────────────────────────────────────────
export const empresaApi = {
  getProfile: () => api.get('/empresas/profile').then(r => r.data),
  updateProfile: (data: Record<string, unknown>) =>
    api.patch('/empresas/profile', data).then(r => r.data),
  /** Perfil público de la marca (visible para influencers) */
  getPublic: (id: number): Promise<EmpresaPublicProfile> =>
    api.get(`/empresas/${id}/public`).then(r => r.data),
}

export interface EmpresaPublicProfile {
  id: number
  nombre_comercial: string
  descripcion: string | null
  rubro: string | null
  pais: string | null
  sitio_web: string | null
  instagram_url: string | null
  tiktok_url: string | null
  avatar_url: string | null
  miembro_desde: string | null
  is_verified: boolean
  stats: { contratos_completados: number; influencers_contratados: number; disputas: number }
}

// ─── Influencer ───────────────────────────────────────────────────────────────
export const influencerApi = {
  getProfile:    () => api.get('/influencers/profile').then(r => r.data),
  updateProfile: (data: Record<string, unknown>) =>
    api.patch('/influencers/profile', data).then(r => r.data),
  getPublic: (id: number) => api.get(`/influencers/${id}`).then(r => r.data),
  getByUsername: (username: string) =>
    api.get(`/influencers/by-username/${username.replace(/^@/, '')}`).then(r => r.data),

  // Buscador (§4.1)
  search: (params: { red_social?: string; ubicacion?: string; rubro?: string; min_seguidores?: number; max_tarifa?: number; page?: number; limit?: number }) =>
    api.get('/influencers', { params }).then(r => r.data),

  // Métricas de redes sociales
  getMetrics:     () => api.get('/influencers/metrics/mine').then(r => r.data),
  addMetric:      (data: { red_social: string; username: string }) =>
    api.post('/influencers/metrics', data).then(r => r.data),
  updateMetric:   (id: number, data: { username?: string; seguidores?: number; engagement_rate?: number }) =>
    api.patch(`/influencers/metrics/${id}`, data).then(r => r.data),
  deleteMetric:   (id: number) => api.delete(`/influencers/metrics/${id}`),
  verifyMetric:   (id: number) => api.post(`/influencers/metrics/${id}/verify`).then(r => r.data),
}
