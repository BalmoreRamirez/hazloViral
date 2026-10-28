import { IsIn, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class ResolveCounterDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  message_id: number;

  @IsIn(['accept', 'reject'])
  action: 'accept' | 'reject';
}
