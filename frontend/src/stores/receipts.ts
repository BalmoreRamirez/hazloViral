import { defineStore } from 'pinia'
import { ref } from 'vue'
import { receiptsApi, type PaymentReceipt } from '@/api/receipts'

export const useReceiptsStore = defineStore('receipts', () => {
  const receipts = ref<PaymentReceipt[]>([])
  const loading = ref(false)
  const error = ref('')

  async function fetchReceipts() {
    loading.value = true
    error.value = ''
    try {
      receipts.value = await receiptsApi.list()
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'No se pudieron cargar los comprobantes.'
    } finally {
      loading.value = false
    }
  }

  return { receipts, loading, error, fetchReceipts }
})
