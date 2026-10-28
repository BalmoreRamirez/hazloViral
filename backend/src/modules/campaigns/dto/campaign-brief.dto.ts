import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { DERECHOS_USO, PLATAFORMAS_BRIEF } from '../entities/campaign-brief.entity';

export class BriefArchivoDto {
  @IsString() @IsNotEmpty()
  url: string;

  @IsString() @MaxLength(255)
  nombre: string;

  @IsString()
  tipo_archivo: string;

  @Type(() => Number) @IsNumber() @Min(0)
  size_bytes: number;
}

/** Campos opcionales comunes a creación y edición */
class BriefOptionalFields {
  @IsOptional() @IsString() @MaxLength(100)
  tono_de_voz?: string;

  @IsOptional() @IsString()
  puntos_clave_si?: string;

  @IsOptional() @IsString()
  restricciones_no?: string;

  @IsOptional() @IsString()
  recursos_esteticos?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  presupuesto_min?: number | null;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  presupuesto_max?: number | null;

  @IsOptional() @IsString()
  publico_objetivo?: string;

  @IsOptional() @IsDateString()
  fecha_inicio?: string | null;

  @IsOptional() @IsDateString()
  fecha_fin?: string | null;

  @IsOptional() @IsString()
  formatos?: string;

  @IsOptional() @IsString()
  hashtags_menciones?: string;

  @IsOptional() @IsIn(DERECHOS_USO)
  derechos_uso?: string | null;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(365)
  exclusividad_dias?: number | null;

  @IsOptional() @IsString()
  exclusividad_detalle?: string;

  @IsOptional() @IsBoolean()
  requiere_disclosure?: boolean;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BriefArchivoDto)
  archivos?: BriefArchivoDto[];
}

export class CreateCampaignBriefDto extends BriefOptionalFields {
  @IsString() @IsNotEmpty() @MaxLength(255)
  titulo_campana: string;

  @IsString() @IsNotEmpty({ message: 'El objetivo principal es obligatorio.' })
  objetivo_principal: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Selecciona al menos una plataforma.' })
  @IsIn(PLATAFORMAS_BRIEF, { each: true })
  plataformas: string[];
}

export class UpdateCampaignBriefDto extends BriefOptionalFields {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(255)
  titulo_campana?: string;

  @IsOptional() @IsString() @IsNotEmpty()
  objetivo_principal?: string;

  @IsOptional() @IsArray() @ArrayMinSize(1) @IsIn(PLATAFORMAS_BRIEF, { each: true })
  plataformas?: string[];
}
