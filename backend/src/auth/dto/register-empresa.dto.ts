import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MaxLength, ValidateIf } from 'class-validator';
import { NIT_REGEX, NRC_REGEX, TELEFONO_REGEX } from '../../empresas/dto/update-empresa.dto';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;
const PASSWORD_MSG   = 'La contraseña debe tener entre 8 y 128 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial.';

const TIPOS_ID = ['DUI', 'PASAPORTE'] as const;

export class RegisterEmpresaDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MSG })
  password: string;

  @IsString()
  @IsNotEmpty()
  nombre_comercial: string;

  @ValidateIf(o => o.sitio_web != null && o.sitio_web !== '')
  @IsUrl()
  sitio_web?: string;

  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  rubro?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  razon_social?: string;

  @ValidateIf(o => o.nit != null && o.nit !== '')
  @Matches(NIT_REGEX, { message: 'NIT inválido. Formato: 0000-000000-000-0' })
  nit?: string;

  @ValidateIf(o => o.nrc != null && o.nrc !== '')
  @Matches(NRC_REGEX, { message: 'NRC inválido. Formato: 000000-0' })
  nrc?: string;

  @Matches(TELEFONO_REGEX, { message: 'Teléfono inválido. Ejemplo: +503 7000-0000' })
  telefono: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del representante legal es obligatorio.' })
  @MaxLength(255)
  representante_nombre: string;

  @IsIn(TIPOS_ID)
  representante_tipo_identificacion: 'DUI' | 'PASAPORTE';

  @IsString()
  @IsNotEmpty()
  representante_numero_identificacion: string;
}
