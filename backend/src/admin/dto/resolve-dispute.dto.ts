import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ResolveDisputeDto {
  // empresa → devolver fondos | influencer → pagar al influencer | split → mitad cada uno
  @IsIn(['empresa', 'influencer', 'split'])
  decision: 'empresa' | 'influencer' | 'split';

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  nota: string;
}
