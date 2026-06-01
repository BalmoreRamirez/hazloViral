import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

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
}
