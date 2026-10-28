import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReportNonComplianceDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  contrato_id: number;

  @IsString()
  @IsNotEmpty()
  motivo: string;
}
