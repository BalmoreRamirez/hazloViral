import { Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';

export class RatingPageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;
}
