import { IsString, IsEnum, IsOptional, IsObject, IsBoolean, IsInt, IsDateString } from 'class-validator';
import { RetentionAction, PolicyStatus } from '../entities/data-retention-policy.entity';

export class CreateRetentionPolicyDto {
  @IsString()
  policy_name: string;

  @IsString()
  description: string;

  @IsString()
  entity_type: string;

  @IsInt()
  retention_days: number;

  @IsEnum(RetentionAction)
  action: RetentionAction;

  @IsEnum(PolicyStatus)
  @IsOptional()
  status?: PolicyStatus;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  auto_execute?: boolean;

  @IsString()
  @IsOptional()
  execution_schedule?: string;
}

export class UpdateRetentionPolicyDto {
  @IsString()
  @IsOptional()
  policy_name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  retention_days?: number;

  @IsEnum(RetentionAction)
  @IsOptional()
  action?: RetentionAction;

  @IsEnum(PolicyStatus)
  @IsOptional()
  status?: PolicyStatus;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  auto_execute?: boolean;

  @IsString()
  @IsOptional()
  execution_schedule?: string;
}

export class ExecuteRetentionPolicyDto {
  @IsBoolean()
  @IsOptional()
  dry_run?: boolean;
}
