import { api } from './index'
import { parseMoney } from '@/utils/money'

export interface PaymentReceipt {
  id: number
  receipt_number: string
  operation_type: 'credits_top_up' | 'escrow_funding' | 'platform_commission' | 'influencer_payout'
  operation_reference: string
  wompi_transaction_id: string | null
  contrato_id: number | null
  amount_usd: number | null
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
    subtotal?: number | null
    monto_iva?: number | null
    total_pagar?: number | null
    pdf_url: string | null
  } | null
  created_at: string
}

type ReceiptDteResponse = Omit<NonNullable<PaymentReceipt['dte']>, 'subtotal' | 'monto_iva' | 'total_pagar'> & {
  subtotal?: number | string | null
  monto_iva?: number | string | null
  total_pagar?: number | string | null
}

type PaymentReceiptResponse = Omit<PaymentReceipt, 'amount_usd' | 'dte'> & {
  amount_usd: number | string | null
  dte: ReceiptDteResponse | null
}

function normalizeReceipt(receipt: PaymentReceiptResponse): PaymentReceipt {
  // USD is the platform currency. Normalize historical receipts created before
  // the currency migration so the UI never presents COP.
  return {
    ...receipt,
    amount_usd: parseMoney(receipt.amount_usd),
    currency: 'USD',
    dte: receipt.dte ? {
      ...receipt.dte,
      subtotal: parseMoney(receipt.dte.subtotal),
      monto_iva: parseMoney(receipt.dte.monto_iva),
      total_pagar: parseMoney(receipt.dte.total_pagar),
    } : null,
  }
}

export const receiptsApi = {
  sendInvoice: (id: number) => api.post<{ sent: boolean }>(`/receipts/${id}/send-invoice`).then(r => r.data),
  listTopUps: () => api.get<PaymentReceiptResponse[]>('/receipts/top-ups').then(r => r.data.map(normalizeReceipt)),
  list: () => api.get<PaymentReceiptResponse[]>('/receipts').then((r) => r.data.map(normalizeReceipt)),
  get: (id: number) => api.get<PaymentReceiptResponse>(`/receipts/${id}`).then((r) => normalizeReceipt(r.data)),
  downloadDte: async (url: string): Promise<Blob> => {
    const path = url.replace(/^\/api/, '')
    const response = await api.get<Blob>(path, { responseType: 'blob' })
    return response.data
  },
}
