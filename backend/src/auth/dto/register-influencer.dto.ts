import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterInfluencerDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
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
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tarifa_base?: number;

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
