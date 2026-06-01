import { api } from './index'

export const contractsApi = {
  list: () => api.get('/contratos').then((r) => r.data),
  get: (id: number) => api.get(`/contratos/${id}`).then((r) => r.data),
  acceptProposal: (message_id: number) =>
    api.post('/contratos/accept-proposal', { message_id }).then((r) => r.data),
  contractCheckout: (contratoId: number) =>
    api.post(`/stripe/contract-checkout/${contratoId}`).then((r) => r.data),
  submitDeliverables: (id: number, evidencias: { tipo: string; descripcion: string; url: string }[]) =>
    api.post(`/contratos/${id}/submit-deliverables`, { evidencias }).then((r) => r.data),
  approve: (id: number) => api.post(`/contratos/${id}/approve`).then((r) => r.data),
  dispute: (id: number, motivo: string) =>
    api.post(`/contratos/${id}/dispute`, { motivo }).then((r) => r.data),
}
