import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MaxLength, ValidateIf } from 'class-validator';

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

  @IsIn(TIPOS_ID)
  representante_tipo_identificacion: 'DUI' | 'PASAPORTE';

  @IsString()
  @IsNotEmpty()
  representante_numero_identificacion: string;
}
