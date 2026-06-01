import { api } from './index'

export const adminApi = {
  getStats: () => api.get('/admin/stats').then((r) => r.data),

  // Settings
  getSettings: () => api.get('/admin/settings').then((r) => r.data),
  updateSetting: (key: string, value: string) =>
    api.patch(`/admin/settings/${key}`, { value }).then((r) => r.data),

  // Disputes
  getDisputes: () => api.get('/admin/disputes').then((r) => r.data),
  resolveDispute: (id: number, decision: 'empresa' | 'influencer' | 'split', nota: string) =>
    api.post(`/admin/disputes/${id}/resolve`, { decision, nota }).then((r) => r.data),

  // Users
  getUsers: () => api.get('/admin/users').then((r) => r.data),
  setUserStatus: (id: number, is_active: boolean) =>
    api.patch(`/admin/users/${id}/status`, { is_active }).then((r) => r.data),
}
