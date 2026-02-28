import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { AuditAction, AuditSeverity } from '../entities/audit-log.entity';

export class CreateAuditLogDto {
  @IsEnum(AuditAction)
  action: AuditAction;

  @IsString()
  entity_type: string;

  @IsString()
  @IsOptional()
  entity_id?: string;

  @IsObject()
  @IsOptional()
  old_values?: Record<string, any>;

  @IsObject()
  @IsOptional()
  new_values?: Record<string, any>;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  ip_address?: string;

  @IsString()
  @IsOptional()
  user_agent?: string;

  @IsEnum(AuditSeverity)
  @IsOptional()
  severity?: AuditSeverity;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class QueryAuditLogsDto {
  @IsString()
  @IsOptional()
  user_id?: string;

  @IsEnum(AuditAction)
  @IsOptional()
  action?: AuditAction;

  @IsString()
  @IsOptional()
  entity_type?: string;

  @IsString()
  @IsOptional()
  entity_id?: string;

  @IsString()
  @IsOptional()
  start_date?: string;

  @IsString()
  @IsOptional()
  end_date?: string;

  @IsEnum(AuditSeverity)
  @IsOptional()
  severity?: AuditSeverity;
}
