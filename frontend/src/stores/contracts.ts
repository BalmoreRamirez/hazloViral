import { defineStore } from 'pinia'
import { ref } from 'vue'
import { contractsApi, type EntregableConArchivos, type PublicationLink } from '@/api/contracts'

export interface RevisionRound {
  id: number
  contrato_id: number
  round_number: number
  feedback: string
  requested_by: number
  created_at: string
}

export interface AuditLogEntry {
  id: number
  contrato_id: number
  actor_id: number
  action: string
  previous_status: string | null
  new_status: string | null
  metadata: Record<string, any> | null
  created_at: string
}

export interface Contract {
  id: number
  chat_id: number
  empresa_id: number
  influencer_id: number
  monto_total: number
  comision_plataforma: number
  contrato_pdf_url: string | null
  entregables: EntregableConArchivos[]
  fecha_limite_entrega: string
  revision_round: number
  publication_links: PublicationLink[] | null
  motivo_incumplimiento: string | null
  status: string
  stripe_charge_id: string | null
  stripe_transfer_id: string | null
  created_at: string
  updated_at: string
  empresa?: any
  influencer?: any
}

export const useContractsStore = defineStore('contracts', () => {
  const contracts = ref<Contract[]>([])
  const current   = ref<Contract | null>(null)
  const loading   = ref(false)
  const revisionRounds = ref<RevisionRound[]>([])
  const auditLog  = ref<AuditLogEntry[]>([])

  async function fetchContracts() {
    loading.value = true
    try { contracts.value = await contractsApi.list() }
    finally { loading.value = false }
  }

  async function fetchContract(id: number) {
    loading.value = true
    try { current.value = await contractsApi.get(id) }
    finally { loading.value = false }
  }

  async function fetchRevisionRounds(id: number) {
    revisionRounds.value = await contractsApi.getRevisionRounds(id)
  }

  async function fetchAuditLog(id: number) {
    auditLog.value = await contractsApi.getAuditLog(id)
  }

  // Negociación
  async function acceptProposal(message_id: number) {
    const c = await contractsApi.acceptProposal(message_id)
    contracts.value.unshift(c)
    return c
  }

  async function rejectProposal(message_id: number) {
    return contractsApi.rejectProposal(message_id)
  }

  async function counterProposal(message_id: number, tarifa_propuesta: number, justificacion: string) {
    return contractsApi.counterProposal(message_id, tarifa_propuesta, justificacion)
  }

  async function resolveCounter(message_id: number, action: 'accept' | 'reject') {
    const result = await contractsApi.resolveCounter(message_id, action)
    if (result?.id) contracts.value.unshift(result)
    return result
  }

  // Escrow — producción: redirige a Wompi checkout
  async function fundContract(contratoId: number) {
    const { url } = await contractsApi.contractCheckout(contratoId)
    window.location.href = url
  }

  // Escrow — solo modo desarrollo: simula el pago sin Wompi
  async function simulateFund(contratoId: number) {
    current.value = await contractsApi.simulateFund(contratoId)
    return current.value
  }

  async function submitDeliverables(id: number, entregables: EntregableConArchivos[]) {
    current.value = await contractsApi.submitDeliverables(id, entregables)
    return current.value
  }

  async function requestChanges(contrato_id: number, feedback: string) {
    current.value = await contractsApi.requestChanges(contrato_id, feedback)
    return current.value
  }

  async function approveDeliverables(id: number) {
    current.value = await contractsApi.approveDeliverables(id)
    return current.value
  }

  async function registerPublications(contrato_id: number, publications: { red_social: string; url: string }[]) {
    current.value = await contractsApi.registerPublications(contrato_id, publications)
    return current.value
  }

  async function approve(id: number) {
    current.value = await contractsApi.approve(id)
    return current.value
  }

  async function reportNonCompliance(contrato_id: number, motivo: string) {
    current.value = await contractsApi.reportNonCompliance(contrato_id, motivo)
    return current.value
  }

  async function dispute(id: number, motivo: string) {
    current.value = await contractsApi.dispute(id, motivo)
    return current.value
  }

  return {
    contracts, current, loading, revisionRounds, auditLog,
    fetchContracts, fetchContract, fetchRevisionRounds, fetchAuditLog,
    acceptProposal, rejectProposal, counterProposal, resolveCounter,
    fundContract, simulateFund, submitDeliverables, requestChanges, approveDeliverables,
    registerPublications, approve, reportNonCompliance, dispute,
  }
})
