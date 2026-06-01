import { defineStore } from 'pinia'
import { ref } from 'vue'
import { contractsApi } from '@/api/contracts'

export interface Contract {
  id: number; chat_id: number; empresa_id: number; influencer_id: number
  monto_total: number; comision_plataforma: number; entregables: any[]
  fecha_limite_entrega: string; status: string
  stripe_charge_id: string | null; stripe_transfer_id: string | null
  created_at: string; updated_at: string
  empresa?: any; influencer?: any
}

export const useContractsStore = defineStore('contracts', () => {
  const contracts = ref<Contract[]>([])
  const current   = ref<Contract | null>(null)
  const loading   = ref(false)

  async function fetchContracts() {
    loading.value   = true
    try { contracts.value = await contractsApi.list() }
    finally { loading.value = false }
  }

  async function fetchContract(id: number) {
    loading.value = true
    try { current.value = await contractsApi.get(id) }
    finally { loading.value = false }
  }

  async function acceptProposal(message_id: number) {
    const c = await contractsApi.acceptProposal(message_id)
    contracts.value.unshift(c)
    return c
  }

  async function fundViaStripe(contratoId: number) {
    const { url } = await contractsApi.contractCheckout(contratoId)
    window.location.href = url
  }

  async function submitDeliverables(id: number, evidencias: any[]) {
    current.value = await contractsApi.submitDeliverables(id, evidencias)
    return current.value
  }

  async function approve(id: number) {
    current.value = await contractsApi.approve(id)
    return current.value
  }

  async function dispute(id: number, motivo: string) {
    current.value = await contractsApi.dispute(id, motivo)
    return current.value
  }

  return { contracts, current, loading, fetchContracts, fetchContract, acceptProposal, fundViaStripe, submitDeliverables, approve, dispute }
})
