import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenChatDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  influencer_id: number;
}
