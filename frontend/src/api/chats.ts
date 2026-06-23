import { api } from './index'

export async function uploadContratoPdf(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/uploads/pdf', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  // data.url = "/api/uploads/pdf/filename.pdf" — prefijamos con el host del backend
  const backendOrigin = (api.defaults.baseURL ?? '').replace(/\/api$/, '')
  return `${backendOrigin}${data.url as string}`
}

export const chatsApi = {
  open: (influencer_id: number) =>
    api.post('/chats', { influencer_id }).then((r) => r.data),
  list: () => api.get('/chats').then((r) => r.data),
  messages: (chatId: number, limit = 50, offset = 0) =>
    api.get(`/chats/${chatId}/messages`, { params: { limit, offset } }).then((r) => r.data),
}
