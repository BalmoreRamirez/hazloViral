import { api } from './index'

// ─── Empresa ─────────────────────────────────────────────────────────────────
export const empresaApi = {
  getProfile: () => api.get('/empresas/profile').then(r => r.data),
  updateProfile: (data: { nombre_comercial?: string; sitio_web?: string; umbral_creditos?: number }) =>
    api.patch('/empresas/profile', data).then(r => r.data),
}

// ─── Influencer ───────────────────────────────────────────────────────────────
export const influencerApi = {
  getProfile:    () => api.get('/influencers/profile').then(r => r.data),
  updateProfile: (data: { nombre_artistico?: string; bio?: string; ubicacion?: string; tarifa_base?: number; disponibilidad?: boolean }) =>
    api.patch('/influencers/profile', data).then(r => r.data),
  getPublic: (id: number) => api.get(`/influencers/${id}`).then(r => r.data),

  // Buscador (§4.1)
  search: (params: { red_social?: string; ubicacion?: string; min_seguidores?: number; max_tarifa?: number; page?: number; limit?: number }) =>
    api.get('/influencers', { params }).then(r => r.data),

  // Métricas de redes sociales (§4 "Carga Manual V1")
  getMetrics:     () => api.get('/influencers/metrics/mine').then(r => r.data),
  addMetric:      (data: { red_social: string; username: string; seguidores: number; engagement_rate: number }) =>
    api.post('/influencers/metrics', data).then(r => r.data),
  updateMetric:   (id: number, data: { username?: string; seguidores?: number; engagement_rate?: number }) =>
    api.patch(`/influencers/metrics/${id}`, data).then(r => r.data),
  deleteMetric:   (id: number) => api.delete(`/influencers/metrics/${id}`),
  verifyMetric:   (id: number) => api.post(`/influencers/metrics/${id}/verify`).then(r => r.data),

  // Stripe Connect onboarding (§4.2)
  connectOnboard: () => api.post('/stripe/connect/onboard').then(r => r.data),
}
