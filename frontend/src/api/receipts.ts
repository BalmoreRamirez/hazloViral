import { api } from './index'

export interface PaymentReceipt {
  id: number
  receipt_number: string
  operation_type: 'credits_top_up' | 'escrow_funding' | 'platform_commission' | 'influencer_payout'
  operation_reference: string
  wompi_transaction_id: string | null
  contrato_id: number | null
  amount_usd: number
  currency: 'USD'
  issuer_snapshot: Record<string, string | null>
  customer_snapshot: Record<string, string | null>
  metadata: Record<string, unknown> | null
  is_fiscal_dte: boolean
  factura_enviada: boolean
  dte: {
    numero_control: string
    codigo_generacion: string
    estado: string
    ambiente: string
    fecha_emision: string
    pdf_url: string | null
  } | null
  created_at: string
}

function normalizeReceipt(receipt: PaymentReceipt): PaymentReceipt {
  // USD is the platform currency. Normalize historical receipts created before
  // the currency migration so the UI never presents COP.
  return { ...receipt, currency: 'USD' }
}

export const receiptsApi = {
  list: () => api.get<PaymentReceipt[]>('/receipts').then((r) => r.data.map(normalizeReceipt)),
  get: (id: number) => api.get<PaymentReceipt>(`/receipts/${id}`).then((r) => normalizeReceipt(r.data)),
}
