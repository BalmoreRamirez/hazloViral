import { api } from './index'

export interface ArchivoEntregable {
  url: string
  tipo_archivo: 'video' | 'imagen' | 'banner' | 'documento'
  nombre: string
  size_bytes: number
}

export interface EntregableConArchivos {
  tipo: string
  descripcion: string
  archivos: ArchivoEntregable[]
}

export interface PublicationLink {
  red_social: string
  url: string
  publicado_at: string
}

export const contractsApi = {
  // Consultas
  list: () => api.get('/contratos').then((r) => r.data),
  get: (id: number) => api.get(`/contratos/${id}`).then((r) => r.data),
  getRevisionRounds: (id: number) => api.get(`/contratos/${id}/revision-rounds`).then((r) => r.data),
  getAuditLog: (id: number) => api.get(`/contratos/${id}/audit-log`).then((r) => r.data),

  // Flujo de negociación
  acceptProposal: (message_id: number) =>
    api.post('/contratos/accept-proposal', { message_id }).then((r) => r.data),
  rejectProposal: (message_id: number) =>
    api.post('/contratos/reject-proposal', { message_id }).then((r) => r.data),
  counterProposal: (message_id: number, tarifa_propuesta: number, justificacion: string) =>
    api.post('/contratos/counter-proposal', { message_id, tarifa_propuesta, justificacion }).then((r) => r.data),
  resolveCounter: (message_id: number, action: 'accept' | 'reject') =>
    api.post('/contratos/resolve-counter', { message_id, action }).then((r) => r.data),

  // Flujo del contrato
  contractCheckout: (contratoId: number) =>
    api.post(`/wompi/contract-checkout/${contratoId}`).then((r) => r.data),
  submitDeliverables: (id: number, entregables: EntregableConArchivos[]) =>
    api.post(`/contratos/${id}/submit-deliverables`, { entregables }).then((r) => r.data),
  requestChanges: (contrato_id: number, feedback: string) =>
    api.post(`/contratos/${contrato_id}/request-changes`, { contrato_id, feedback }).then((r) => r.data),
  approveDeliverables: (id: number) =>
    api.post(`/contratos/${id}/approve-deliverables`).then((r) => r.data),
  registerPublications: (contrato_id: number, publications: { red_social: string; url: string }[]) =>
    api.post(`/contratos/${contrato_id}/register-publications`, { contrato_id, publications }).then((r) => r.data),
  approve: (id: number) => api.post(`/contratos/${id}/approve`).then((r) => r.data),
  reportNonCompliance: (contrato_id: number, motivo: string) =>
    api.post(`/contratos/${contrato_id}/report-noncompliance`, { contrato_id, motivo }).then((r) => r.data),
  dispute: (id: number, motivo: string) =>
    api.post(`/contratos/${id}/dispute`, { motivo }).then((r) => r.data),

  // Solo FORMA_PAGO=desarrollo: simula el fondeo sin pasar por Wompi
  simulateFund: (id: number) =>
    api.post(`/wompi/dev/simulate-fund/${id}`).then((r) => r.data),

  // Upload de archivos de entregables
  uploadFile: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/uploads/file', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data as ArchivoEntregable & { url: string })
  },
}
