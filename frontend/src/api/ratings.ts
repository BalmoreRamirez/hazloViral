import { api } from './index'

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

  async getAll(influencerId: number): Promise<RatingItem[]> {
    const { data } = await api.get(`/influencers/${influencerId}/ratings`)
    return data
  },

  async getMine(influencerId: number): Promise<MyRating | null> {
    const { data } = await api.get(`/influencers/${influencerId}/ratings/mine`)
    return data
  },

  async upsert(influencerId: number, payload: { estrellas: number; comentario?: string }): Promise<MyRating> {
    const { data } = await api.post(`/influencers/${influencerId}/ratings`, payload)
    return data
  },
}
