import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  // No MinLength here: login only checks the password, the rules belong to register
  @IsString()
  @IsNotEmpty()
  password: string;
}
