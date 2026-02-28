import { IsString, IsEnum, IsOptional, IsObject, IsBoolean, IsInt, IsDateString } from 'class-validator';
import { RuleType, RuleStatus, ComplianceFramework } from '../entities/compliance-rule.entity';

export class CreateComplianceRuleDto {
  @IsString()
  rule_code: string;

  @IsString()
  rule_name: string;

  @IsString()
  description: string;

  @IsEnum(RuleType)
  rule_type: RuleType;

  @IsEnum(ComplianceFramework)
  framework: ComplianceFramework;

  @IsEnum(RuleStatus)
  @IsOptional()
  status?: RuleStatus;

  @IsObject()
  conditions: Record<string, any>;

  @IsObject()
  @IsOptional()
  actions?: Record<string, any>;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  auto_check?: boolean;

  @IsString()
  @IsOptional()
  check_frequency?: string;

  @IsDateString()
  @IsOptional()
  effective_date?: string;

  @IsDateString()
  @IsOptional()
  expiry_date?: string;
}

export class UpdateComplianceRuleDto {
  @IsString()
  @IsOptional()
  rule_name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RuleStatus)
  @IsOptional()
  status?: RuleStatus;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @IsObject()
  @IsOptional()
  actions?: Record<string, any>;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  auto_check?: boolean;

  @IsString()
  @IsOptional()
  check_frequency?: string;

  @IsDateString()
  @IsOptional()
  effective_date?: string;

  @IsDateString()
  @IsOptional()
  expiry_date?: string;
}

export class ExecuteComplianceCheckDto {
  @IsString()
  @IsOptional()
  entity_id?: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}
