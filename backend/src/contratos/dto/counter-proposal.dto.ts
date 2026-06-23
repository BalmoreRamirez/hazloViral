import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CounterProposalDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  message_id: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  tarifa_propuesta: number;

  @IsString()
  @IsNotEmpty()
  justificacion: string;
}
