import { api } from './index'
import type { BriefArchivo } from '@/stores/profile'

export interface CampaignBriefPayload {
  titulo_campana: string
  objetivo_principal: string
  plataformas: string[]
  tono_de_voz?: string
  puntos_clave_si?: string
  restricciones_no?: string
  recursos_esteticos?: string
  presupuesto_min?: number | null
  presupuesto_max?: number | null
  publico_objetivo?: string
  fecha_inicio?: string | null
  fecha_fin?: string | null
  formatos?: string
  hashtags_menciones?: string
  derechos_uso?: string | null
  exclusividad_dias?: number | null
  exclusividad_detalle?: string
  requiere_disclosure?: boolean
  archivos?: BriefArchivo[]
}

export const campaignsApi = {
  list:   () => api.get('/campaigns').then(r => r.data),
  get:    (id: number) => api.get(`/campaigns/${id}`).then(r => r.data),
  create: (data: CampaignBriefPayload) => api.post('/campaigns', data).then(r => r.data),
  update: (id: number, data: Partial<CampaignBriefPayload>) => api.patch(`/campaigns/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/campaigns/${id}`),

  /** Sube un archivo de referencia (logo, moodboard, guía de marca) */
  uploadArchivo: async (file: File): Promise<BriefArchivo> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post('/uploads/file', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    return data
  },
}
