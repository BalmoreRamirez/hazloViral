import { api } from './index'

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  registerEmpresa: (data: {
    email: string; password: string; nombre_comercial: string; sitio_web?: string
  }) => api.post('/auth/register/empresa', data).then((r) => r.data),

  registerInfluencer: (data: {
    email: string; password: string; nombre_artistico: string
    bio?: string; ubicacion?: string; tarifa_base?: number; fecha_nacimiento: string
    tutor_nombre?: string; tutor_documento_id?: string; tutor_email?: string; tutor_autorizacion?: boolean
  }) => api.post('/auth/register/influencer', data).then((r) => r.data),

  me: () => api.get('/auth/me').then((r) => r.data),
}
