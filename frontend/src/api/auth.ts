import { api } from './index'

export interface RegistrationConsentPayload {
  accepted_terms: boolean; accepted_privacy: boolean; terms_version: string; privacy_version: string
}
export interface RegistrationLegalDocument {
  title: string; version: string; sha256: string; sections: { title: string; text: string }[]
}
export interface RegistrationLegalDocuments { terms: RegistrationLegalDocument; privacy: RegistrationLegalDocument }

export const authApi = {
  legalDocuments: () => api.get<RegistrationLegalDocuments>('/auth/legal-documents').then(r => r.data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  registerEmpresa: (data: RegistrationConsentPayload & {
    email: string; password: string; nombre_comercial: string; sitio_web?: string
    pais?: string; direccion?: string; rubro?: string
    razon_social?: string; nit?: string; nrc?: string
    telefono: string
    representante_nombre: string
    representante_tipo_identificacion: 'DUI' | 'PASAPORTE'
    representante_numero_identificacion: string
  }) => api.post('/auth/register/empresa', data).then((r) => r.data),

  registerInfluencer: (data: RegistrationConsentPayload & {
    email: string; password: string; username: string; nombre_artistico: string
    bio?: string; ubicacion?: string; direccion?: string; rubros?: string[]; tarifa_base?: number; fecha_nacimiento: string
    tipo_identificacion: 'DUI' | 'PASAPORTE'; numero_identificacion: string
    tutor_nombre?: string; tutor_documento_id?: string; tutor_email?: string; tutor_autorizacion?: boolean
  }) => api.post('/auth/register/influencer', data).then((r) => r.data),

  me: () => api.get('/auth/me').then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then((r) => r.data as { dev_reset_url?: string }),

  resetPassword: (token: string, new_password: string) =>
    api.post('/auth/reset-password', { token, new_password }),

  verifyEmail: (token: string) =>
    api.get('/auth/verify-email', { params: { token } }),

  resendVerification: () =>
    api.post('/auth/resend-verification').then((r) => r.data),
}
