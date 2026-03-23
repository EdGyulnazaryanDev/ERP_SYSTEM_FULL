import { IsString, IsOptional, IsEnum, IsBoolean, IsObject, IsArray, IsUUID, Allow } from 'class-validator';
import { ReportCategory, ReportFormat } from '../entities/report-template.entity';

export class CreateReportTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ReportCategory)
  category: ReportCategory;

  @IsString()
  query: string;

  @IsOptional()
  @IsObject()
  parameters?: any;

  @IsOptional()
  @IsObject()
  columns?: any;

  @IsOptional()
  @IsObject()
  filters?: any;

  @IsOptional()
  @IsObject()
  sorting?: any;

  @IsOptional()
  @IsObject()
  grouping?: any;

  @IsOptional()
  @IsObject()
  aggregations?: any;

  @IsOptional()
  @IsArray()
  @IsEnum(ReportFormat, { each: true })
  supported_formats?: ReportFormat[];
}

export class UpdateReportTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ReportCategory)
  category?: ReportCategory;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsObject()
  parameters?: any;

  @IsOptional()
  @IsObject()
  columns?: any;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class GenerateReportDto {
  @IsUUID()
  template_id: string;

  @IsString()
  name: string;

  @IsEnum(ReportFormat)
  format: ReportFormat;

  @IsOptional()
  @IsObject()
  parameters?: any;

  @IsOptional()
  @IsObject()
  filters?: any;
}

export class ExecuteQueryDto {
  @IsString()
  query: string;

  /** Extra bind values for $2, $3, … (array index 0 → $2). Can also be an object with keys "2","3" or "$2". */
  @IsOptional()
  @Allow()
  parameters?: unknown;
}
