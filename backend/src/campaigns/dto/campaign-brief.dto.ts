import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCampaignBriefDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titulo_campana: string;

  @IsOptional()
  @IsString()
  objetivo_principal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tono_de_voz?: string;

  @IsOptional()
  @IsString()
  puntos_clave_si?: string;

  @IsOptional()
  @IsString()
  restricciones_no?: string;

  @IsOptional()
  @IsString()
  recursos_esteticos?: string;
}

export class UpdateCampaignBriefDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  titulo_campana?: string;

  @IsOptional()
  @IsString()
  objetivo_principal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tono_de_voz?: string;

  @IsOptional()
  @IsString()
  puntos_clave_si?: string;

  @IsOptional()
  @IsString()
  restricciones_no?: string;

  @IsOptional()
  @IsString()
  recursos_esteticos?: string;
}
