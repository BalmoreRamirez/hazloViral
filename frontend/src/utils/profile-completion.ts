import type { EmpresaProfile, InfluencerProfile } from '@/stores/profile'

const missing = (value: string | null | undefined) => !value?.trim()

export function companyNeedsProfileGuide(profile: EmpresaProfile | null): boolean {
  if (!profile) return false
  return [profile.nombre_comercial, profile.rubro, profile.telefono, profile.nit,
    profile.representante_nombre, profile.representante_numero_identificacion].some(missing)
    || (!profile.sitio_web && !profile.instagram_url && !profile.tiktok_url)
    || profile.verification_checklist?.logo === false
}

export function influencerNeedsProfileGuide(profile: InfluencerProfile | null): boolean {
  if (!profile) return false
  return [profile.nombre_artistico, profile.username, profile.bio, profile.ubicacion,
    profile.tipo_identificacion, profile.numero_identificacion,
    profile.banco_nombre, profile.banco_cuenta_numero, profile.banco_cuenta_tipo].some(missing)
    || !profile.rubros?.length || !profile.metrics?.some(metric => metric.is_verified)
    || !profile.user?.avatar_url
}
