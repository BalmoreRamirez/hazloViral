import { api } from './index'

export interface CampaignBriefPayload {
  titulo_campana: string
  objetivo_principal?: string
  tono_de_voz?: string
  puntos_clave_si?: string
  restricciones_no?: string
  recursos_esteticos?: string
}

export const campaignsApi = {
  list:   () => api.get('/campaigns').then(r => r.data),
  get:    (id: number) => api.get(`/campaigns/${id}`).then(r => r.data),
  create: (data: CampaignBriefPayload) => api.post('/campaigns', data).then(r => r.data),
  update: (id: number, data: Partial<CampaignBriefPayload>) => api.patch(`/campaigns/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/campaigns/${id}`),
}
