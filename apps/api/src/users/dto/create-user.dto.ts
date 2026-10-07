import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(3, 60)
  @IsOptional()
  name?: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
