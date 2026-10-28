import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

class ArchivoItem {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsIn(['video', 'imagen', 'banner', 'documento'])
  tipo_archivo: 'video' | 'imagen' | 'banner' | 'documento';

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsInt()
  @IsPositive()
  size_bytes: number;
}

class EntregableItem {
  @IsString()
  @IsNotEmpty()
  tipo: string;

  @IsString()
  @IsOptional()
  descripcion: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArchivoItem)
  archivos: ArchivoItem[];
}

export class SubmitDeliverablesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntregableItem)
  entregables: EntregableItem[];
}
