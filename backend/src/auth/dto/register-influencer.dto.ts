import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

const TIPOS_ID = ['DUI', 'PASAPORTE'] as const;

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;
const PASSWORD_MSG   = 'La contraseña debe tener entre 8 y 128 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial.';

export class RegisterInfluencerDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MSG })
  password: string;

  @IsString()
  @IsNotEmpty()
  nombre_artistico: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tarifa_base?: number;

  @IsIn(TIPOS_ID)
  tipo_identificacion: 'DUI' | 'PASAPORTE';

  @IsString()
  @IsNotEmpty()
  numero_identificacion: string;

  // Formato: YYYY-MM-DD
  @IsDateString()
  fecha_nacimiento: string;

  // Campos de tutor — requeridos si el influencer es menor de edad
  @ValidateIf((o) => o._es_menor)
  @IsString()
  @IsNotEmpty()
  tutor_nombre?: string;

  @ValidateIf((o) => o._es_menor)
  @IsString()
  @IsNotEmpty()
  tutor_documento_id?: string;

  @ValidateIf((o) => o._es_menor)
  @IsEmail()
  tutor_email?: string;

  @ValidateIf((o) => o._es_menor)
  @IsBoolean()
  tutor_autorizacion?: boolean;

  get _es_menor(): boolean {
    if (!this.fecha_nacimiento) return false;
    const birth = new Date(this.fecha_nacimiento);
    const age18 = new Date();
    age18.setFullYear(age18.getFullYear() - 18);
    return birth > age18;
  }
}
