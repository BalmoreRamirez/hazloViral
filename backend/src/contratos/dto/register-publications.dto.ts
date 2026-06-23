import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsPositive, IsString, IsUrl, ValidateNested } from 'class-validator';

class PublicationItem {
  @IsString()
  @IsNotEmpty()
  red_social: string;

  @IsString()
  @IsUrl()
  url: string;
}

export class RegisterPublicationsDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  contrato_id: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublicationItem)
  publications: PublicationItem[];
}
