import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  companyName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @MinLength(6)
  confirmPassword: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;
}
