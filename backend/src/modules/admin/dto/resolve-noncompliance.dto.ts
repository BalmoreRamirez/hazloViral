import { IsString, MinLength } from 'class-validator';

export class ResolveNoncomplianceDto {
  @IsString()
  @MinLength(10)
  resolucion: string;
}
