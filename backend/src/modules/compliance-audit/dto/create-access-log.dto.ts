import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { AccessType, AccessResult } from '../entities/access-log.entity';

export class CreateAccessLogDto {
  @IsEnum(AccessType)
  access_type: AccessType;

  @IsString()
  resource_type: string;

  @IsString()
  @IsOptional()
  resource_id?: string;

  @IsEnum(AccessResult)
  result: AccessResult;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
