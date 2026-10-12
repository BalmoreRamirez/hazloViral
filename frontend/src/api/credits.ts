import { api } from './index'

export const creditsApi = {
  getBalance: () => api.get('/credits/balance').then((r) => r.data),
  /** Costo actual de abrir un chat nuevo (lo define el admin) */
  getChatCost: (): Promise<{ costo: number }> => api.get('/credits/chat-cost').then((r) => r.data),
  createCheckout: (amount_usd: number) =>
    api.post('/wompi/credits/checkout', { amount_usd }).then((r) => r.data),
}
