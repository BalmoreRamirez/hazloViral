import { api } from './index'

export interface RatingPage<T> { items: T[]; total: number; page: number; pageSize: number }

export interface RatingSummary {
  promedio: number | null
  total: number
}

export interface RatingItem {
  id: number
  estrellas: number
  comentario: string | null
  created_at: string
  updated_at: string
  empresa_nombre: string
}

export interface MyRating {
  id: number
  estrellas: number
  comentario: string | null
}

export const ratingsApi = {
  async getSummary(influencerId: number): Promise<RatingSummary> {
    const { data } = await api.get(`/influencers/${influencerId}/ratings/summary`)
    return data
  },

  async getAll(influencerId: number, page = 1): Promise<RatingPage<RatingItem>> {
    const { data } = await api.get(`/influencers/${influencerId}/ratings`, { params: { page } })
    return data
  },

  /** Calificación propia y si la empresa puede calificar (contrato completado con el influencer). */
  async getMine(influencerId: number): Promise<{ rating: MyRating | null; puede_calificar: boolean }> {
    const { data } = await api.get(`/influencers/${influencerId}/ratings/mine`)
    return data
  },

  async upsert(influencerId: number, payload: { estrellas: number; comentario?: string }): Promise<MyRating> {
    const { data } = await api.post(`/influencers/${influencerId}/ratings`, payload)
    return data
  },
}

// ─── Calificaciones de marcas (las otorgan influencers con contrato completado) ──
export interface EmpresaRatingItem {
  id: number
  estrellas: number
  comentario: string | null
  created_at: string
  updated_at: string
  influencer_nombre: string
}

export interface MyEmpresaRating {
  rating: MyRating | null
  puede_calificar: boolean
}

export const empresaRatingsApi = {
  async getSummary(empresaId: number): Promise<RatingSummary> {
    const { data } = await api.get(`/empresas/${empresaId}/ratings/summary`)
    return data
  },

  async getAll(empresaId: number, page = 1): Promise<RatingPage<EmpresaRatingItem>> {
    const { data } = await api.get(`/empresas/${empresaId}/ratings`, { params: { page } })
    return data
  },

  async getMine(empresaId: number): Promise<MyEmpresaRating> {
    const { data } = await api.get(`/empresas/${empresaId}/ratings/mine`)
    return data
  },

  async upsert(empresaId: number, payload: { estrellas: number; comentario?: string }): Promise<MyRating> {
    const { data } = await api.post(`/empresas/${empresaId}/ratings`, payload)
    return data
  },
}
