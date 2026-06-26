import { IsString, MinLength } from 'class-validator';

export class ResolveIncumplimientoDto {
  @IsString()
  @MinLength(10)
  resolucion: string;
}
