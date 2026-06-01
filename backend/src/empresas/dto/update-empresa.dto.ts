import { IsNumber, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

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
}
