import { defineStore } from 'pinia'
import { ref } from 'vue'
import { creditsApi } from '@/api/credits'

export interface BalanceInfo {
  empresa_id: number
  balance_creditos: number
  umbral_creditos: number
  is_above_threshold: boolean
  deficit: number
}

export const useCreditsStore = defineStore('credits', () => {
  const balance = ref<BalanceInfo | null>(null)
  const loading = ref(false)

  async function fetchBalance() {
    loading.value = true
    try {
      balance.value = await creditsApi.getBalance()
    } finally {
      loading.value = false
    }
  }

  // Llamado desde ChatGateway cuando llega evento credit_status / chat_blocked
  function updateFromSocket(data: BalanceInfo) {
    balance.value = data
  }

  async function recharge(amountUsd: number) {
    const { url } = await creditsApi.createCheckout(amountUsd)
    window.location.href = url
  }

  return { balance, loading, fetchBalance, updateFromSocket, recharge }
})
