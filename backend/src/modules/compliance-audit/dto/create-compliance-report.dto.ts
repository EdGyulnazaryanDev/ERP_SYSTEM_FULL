import { IsString, IsEnum, IsOptional, IsObject, IsDateString } from 'class-validator';
import { ReportType } from '../entities/compliance-report.entity';

export class CreateComplianceReportDto {
  @IsString()
  report_name: string;

  @IsEnum(ReportType)
  report_type: ReportType;

  @IsString()
  @IsOptional()
  framework?: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;
}
