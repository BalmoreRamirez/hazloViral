import { IsString, Matches, MaxLength } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/;
const PASSWORD_MSG   = 'La contraseña debe tener entre 8 y 128 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial.';

export class ChangePasswordDto {
  @IsString()
  current_password: string;

  @IsString()
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MSG })
  new_password: string;
}
