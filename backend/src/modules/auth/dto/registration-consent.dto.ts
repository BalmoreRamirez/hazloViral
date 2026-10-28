import { Equals, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegistrationConsentDto {
  @Equals(true, { message: 'Debes aceptar los términos y condiciones.' })
  accepted_terms: boolean;

  @Equals(true, { message: 'Debes leer y autorizar el tratamiento descrito en el aviso de privacidad.' })
  accepted_privacy: boolean;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  terms_version: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  privacy_version: string;
}
