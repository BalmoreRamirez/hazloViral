import { api } from './index'

export interface PaymentReceipt {
  id: number
  receipt_number: string
  operation_type: 'credits_top_up' | 'escrow_funding' | 'platform_commission' | 'influencer_payout'
  operation_reference: string
  wompi_transaction_id: string | null
  contrato_id: number | null
  amount_usd: number
  amount_cop: number
  currency: string
  issuer_snapshot: Record<string, string | null>
  customer_snapshot: Record<string, string | null>
  metadata: Record<string, unknown> | null
  is_fiscal_dte: boolean
  created_at: string
}

export const receiptsApi = {
  list: () => api.get<PaymentReceipt[]>('/receipts').then((r) => r.data),
  get: (id: number) => api.get<PaymentReceipt>(`/receipts/${id}`).then((r) => r.data),
}
