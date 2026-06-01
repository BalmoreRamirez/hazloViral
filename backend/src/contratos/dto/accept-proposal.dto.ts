import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class AcceptProposalDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  message_id: number;
}
