import { IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

const REDES = ['TikTok', 'Instagram', 'YouTube', 'Twitter', 'Facebook', 'Twitch', 'LinkedIn'] as const;

export class CreateMetricDto {
  @IsIn(REDES)
  red_social: string;

  @IsString()
  @MaxLength(100)
  username: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  seguidores: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  engagement_rate: number;
}

export class UpdateMetricDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  seguidores?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  engagement_rate?: number;
}
