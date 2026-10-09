export const PAISES = [
  'Argentina','Bolivia','Brasil','Chile','Colombia','Costa Rica','Cuba',
  'Ecuador','El Salvador','España','Estados Unidos','Guatemala','Honduras',
  'México','Nicaragua','Panamá','Paraguay','Perú','Puerto Rico',
  'República Dominicana','Uruguay','Venezuela','Otro',
]

export const DEPARTAMENTOS_SV = [
  'Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán',
  'La Libertad', 'La Paz', 'La Unión', 'Morazán',
  'San Miguel', 'San Salvador', 'San Vicente',
  'Santa Ana', 'Sonsonate', 'Usulután',
]

// La ubicación se guarda como "Departamento, El Salvador" o solo "País"
export function parseUbicacion(ubicacion: string | null | undefined) {
  const parts = (ubicacion ?? '').split(',').map(s => s.trim())
  const pais  = parts.at(-1) ?? ''
  if (!PAISES.includes(pais)) return { pais: '', departamento: '' }
  const departamento = pais === 'El Salvador' && DEPARTAMENTOS_SV.includes(parts[0] ?? '') ? parts[0]! : ''
  return { pais, departamento }
}

export function formatUbicacion(pais: string, departamento: string) {
  return pais === 'El Salvador' && departamento ? `${departamento}, El Salvador` : pais
}
