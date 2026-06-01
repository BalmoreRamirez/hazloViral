import { IsNumber, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCreditCheckoutDto {
  // Monto en USD a recargar (se convierte en créditos 1:1)
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(10000)
  amount_usd: number;
}
