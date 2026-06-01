import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

class EvidenciaItem {
  @IsString()
  @IsNotEmpty()
  tipo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsString()
  @IsNotEmpty()
  url: string;
}

export class SubmitDeliverablesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenciaItem)
  evidencias: EvidenciaItem[];
}
