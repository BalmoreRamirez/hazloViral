import { api } from './index'

export const adminApi = {
  getStats: () => api.get('/admin/stats').then((r) => r.data),

  getSettings: () => api.get('/admin/settings').then((r) => r.data),
  updateSetting: (key: string, value: string) =>
    api.patch(`/admin/settings/${key}`, { value }).then((r) => r.data),

  getUsers: () => api.get('/admin/users').then((r) => r.data),
  setUserStatus: (id: number, is_active: boolean) =>
    api.patch(`/admin/users/${id}/status`, { is_active }).then((r) => r.data),

  getIncumplimientos: () => api.get('/admin/incumplimientos').then((r) => r.data),
  resolveIncumplimiento: (id: number, resolucion: string) =>
    api.post(`/admin/incumplimientos/${id}/resolve`, { resolucion }).then((r) => r.data),
}
