import { IsIn, IsNumber, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

const TIPOS_ID = ['DUI', 'PASAPORTE'] as const;

export class UpdateEmpresaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre_comercial?: string;

  @IsOptional()
  @IsUrl()
  sitio_web?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  umbral_creditos?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  representante_nombre?: string;

  @IsOptional()
  @IsIn(TIPOS_ID)
  representante_tipo_identificacion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  representante_numero_identificacion?: string;
}
