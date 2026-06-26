import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

const TIPOS_ID = ['DUI', 'PASAPORTE'] as const;

export class UpdateInfluencerDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre_artistico?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ubicacion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tarifa_base?: number;

  @IsOptional()
  @IsBoolean()
  disponibilidad?: boolean;

  @IsOptional()
  @IsIn(TIPOS_ID)
  tipo_identificacion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  numero_identificacion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  banco_nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  banco_cuenta_numero?: string;

  @IsOptional()
  @IsIn(['CORRIENTE', 'AHORROS'])
  banco_cuenta_tipo?: string;
}
