import { IsEmail, IsIn, IsNotEmpty, IsUUID, MinLength } from 'class-validator';
import { PortalActorType } from '../entities/portal-account.entity';

export class SetPortalCredentialsDto {
  @IsIn([PortalActorType.CUSTOMER, PortalActorType.SUPPLIER])
  actorType: PortalActorType;

  @IsUUID()
  actorId: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @MinLength(6)
  confirmPassword: string;
}
