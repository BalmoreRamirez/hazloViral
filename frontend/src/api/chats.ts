import { api } from './index'

export const chatsApi = {
  open: (influencer_id: number) =>
    api.post('/chats', { influencer_id }).then((r) => r.data),
  list: () => api.get('/chats').then((r) => r.data),
  messages: (chatId: number, limit = 50, offset = 0) =>
    api.get(`/chats/${chatId}/messages`, { params: { limit, offset } }).then((r) => r.data),
}
