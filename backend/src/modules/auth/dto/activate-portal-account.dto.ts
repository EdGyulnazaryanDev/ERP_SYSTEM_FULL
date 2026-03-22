import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { PortalActorType } from '../entities/portal-account.entity';

export class ActivatePortalAccountDto {
  @IsEnum(PortalActorType)
  actorType: PortalActorType;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(6)
  confirmPassword: string;
}
