import type { EmpresaProfile, InfluencerProfile } from '@/stores/profile'
import type { ProfileTourStep } from '@/composables/useProfileTour'

const missing = (value: string | null | undefined) => !value?.trim()
type Field = [key: string, selector: string, title: string]
function fieldSteps(profile: object, fields: Field[]): ProfileTourStep[] {
  return fields.filter(([key]) => missing((profile as Record<string, string>)[key])).map(([, selector, title]) => ({
    selector, title, intro: `Completa ${title.toLowerCase()}. Al terminar la guía, guarda los cambios de esta sección.`,
  }))
}

export function companyProfileGuideSteps(profile: EmpresaProfile | null): ProfileTourStep[] {
  if (!profile || profile.is_verified === true) return []
  const steps = fieldSteps(profile, [
    ['nombre_comercial', '#company-nombre-comercial', 'Nombre comercial'],
    ['rubro', '#company-rubro', 'Rubro de la empresa'],
    ['telefono', '#company-telefono', 'Teléfono de la empresa'],
    ['nit', '#company-nit', 'NIT'],
    ['representante_nombre', '#company-representante-nombre', 'Nombre del representante'],
    ['representante_numero_identificacion', '#company-representante-numero-identificacion', 'Documento del representante'],
  ])
  if (![profile.sitio_web, profile.instagram_url, profile.tiktok_url].some(value => !missing(value))) steps.push({
    selector: '#company-presencia', title: 'Presencia online', intro: 'Agrega un sitio web o una red social de la empresa y guarda los cambios.',
  })
  if (profile.verification_checklist?.logo === false) steps.unshift({
    selector: '#company-avatar', title: 'Logo de la empresa', intro: 'Al terminar la guía, selecciona la imagen o la cámara para subir un logo JPG o PNG de hasta 5 MB.',
  })
  return steps
}

export function influencerProfileGuideSteps(profile: InfluencerProfile | null): ProfileTourStep[] {
  if (!profile || profile.is_verified === true) return []
  const steps = fieldSteps(profile, [
    ['nombre_artistico', '#creator-nombre-artistico', 'Nombre artístico'],
    ['username', '#creator-username', 'Usuario de la aplicación'],
    ['bio', '#creator-bio', 'Biografía'],
    ['ubicacion', '#creator-pais', 'Ubicación'],
    ['tipo_identificacion', '#creator-tipo-identificacion', 'Tipo de documento'],
    ['numero_identificacion', '#creator-numero-identificacion', 'Número de documento'],
    ['banco_nombre', '#creator-banco-nombre', 'Nombre del banco'],
    ['banco_cuenta_numero', '#creator-banco-cuenta-numero', 'Número de cuenta'],
    ['banco_cuenta_tipo', '#creator-banco-cuenta-tipo', 'Tipo de cuenta'],
  ])
  if (!profile.rubros?.length) steps.push({ selector: '#creator-rubros', title: 'Rubro o nicho', intro: 'Selecciona al menos un rubro y guarda los cambios del perfil.' })
  if (!profile.metrics?.some(metric => metric.is_verified)) steps.push({ selector: '#creator-add-social', title: 'Red social verificada', intro: 'Agrega una red social y verifícala desde esta sección.' })
  if (!profile.user?.avatar_url) steps.unshift({ selector: '#creator-avatar', title: 'Foto de perfil', intro: 'Al terminar la guía, selecciona la foto o la cámara para subir una imagen JPG o PNG de hasta 5 MB.' })
  return steps
}

export const companyNeedsProfileGuide = (profile: EmpresaProfile | null) => companyProfileGuideSteps(profile).length > 0
export const influencerNeedsProfileGuide = (profile: InfluencerProfile | null) => influencerProfileGuideSteps(profile).length > 0
