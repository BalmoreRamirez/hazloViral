import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DisputeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  motivo: string;
}
