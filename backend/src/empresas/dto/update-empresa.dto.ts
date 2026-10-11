import { IsEmail, IsIn, IsOptional, IsString, IsUrl, Matches, MaxLength, ValidateIf } from 'class-validator';

const TIPOS_ID = ['DUI', 'PASAPORTE'] as const;

// Formatos de El Salvador. NIT: 0000-000000-000-0 (o 9 dígitos con DUI homologado). NRC: 000000-0
export const NIT_REGEX = /^(\d{4}-?\d{6}-?\d{3}-?\d|\d{8}-?\d)$/;
export const NRC_REGEX = /^\d{1,7}-?\d$/;
export const TELEFONO_REGEX = /^\+?[\d\s-]{8,20}$/;

const optionalUrl = (field: string) => ValidateIf((o) => o[field] != null && o[field] !== '');

/**
 * El umbral de créditos NO es editable por la empresa: lo controla el administrador
 * (regla de negocio §5.1 — bloqueo preventivo con mínimo de $5.00).
 */
export class UpdateEmpresaDto {
  @IsOptional() @IsString() @MaxLength(255)
  nombre_comercial?: string;

  @IsOptional() @IsString() @MaxLength(255)
  razon_social?: string;

  @optionalUrl('nit')
  @Matches(NIT_REGEX, { message: 'NIT inválido. Formato: 0000-000000-000-0' })
  nit?: string;

  @optionalUrl('nrc')
  @Matches(NRC_REGEX, { message: 'NRC inválido. Formato: 000000-0' })
  nrc?: string;

  @optionalUrl('telefono')
  @Matches(TELEFONO_REGEX, { message: 'Teléfono inválido. Ejemplo: +503 7000-0000' })
  telefono?: string;

  @optionalUrl('email_facturacion')
  @IsEmail({}, { message: 'Correo de facturación inválido.' })
  email_facturacion?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  descripcion?: string;

  @optionalUrl('sitio_web')
  @IsUrl({}, { message: 'Sitio web inválido.' })
  sitio_web?: string;

  @optionalUrl('instagram_url')
  @IsUrl({}, { message: 'URL de Instagram inválida.' })
  instagram_url?: string;

  @optionalUrl('tiktok_url')
  @IsUrl({}, { message: 'URL de TikTok inválida.' })
  tiktok_url?: string;

  @IsOptional() @IsString() @MaxLength(100)
  pais?: string;

  @IsOptional() @IsString() @MaxLength(255)
  direccion?: string;

  @IsOptional() @IsString() @MaxLength(255)
  representante_nombre?: string;

  @IsOptional() @IsIn(TIPOS_ID)
  representante_tipo_identificacion?: string;

  @IsOptional() @IsString() @MaxLength(50)
  representante_numero_identificacion?: string;

  @IsOptional() @IsString() @MaxLength(50)
  rubro?: string;
}
