import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import type { ProposalData } from '../../common/types';

export class SendMessageDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  chat_id: number;

  @IsOptional()
  @IsString()
  message_text?: string;

  @IsOptional()
  @IsBoolean()
  is_proposal?: boolean;

  @ValidateIf((o) => o.is_proposal === true)
  @IsObject()
  proposal_data?: ProposalData;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  campaign_brief_id?: number;
}
