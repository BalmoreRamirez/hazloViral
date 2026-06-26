import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

const TIPOS_ID = ['DUI', 'PASAPORTE'] as const;

export class RegisterEmpresaDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  nombre_comercial: string;

  @IsOptional()
  @IsUrl()
  sitio_web?: string;

  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsIn(TIPOS_ID)
  representante_tipo_identificacion: 'DUI' | 'PASAPORTE';

  @IsString()
  @IsNotEmpty()
  representante_numero_identificacion: string;
}
