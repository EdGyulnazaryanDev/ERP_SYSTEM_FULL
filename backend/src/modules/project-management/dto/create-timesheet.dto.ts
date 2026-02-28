import { IsUUID, IsDateString, IsOptional, IsString, IsArray, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class TimesheetEntryDto {
  @IsUUID()
  project_id: string;

  @IsOptional()
  @IsUUID()
  task_id?: string;

  @IsDateString()
  work_date: string;

  @IsNumber()
  hours: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_billable?: boolean;
}

export class CreateTimesheetDto {
  @IsUUID()
  employee_id: string;

  @IsDateString()
  week_start_date: string;

  @IsDateString()
  week_end_date: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimesheetEntryDto)
  entries: TimesheetEntryDto[];
}

export class UpdateTimesheetDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimesheetEntryDto)
  entries?: TimesheetEntryDto[];
}

export class ApproveTimesheetDto {
  @IsUUID()
  approved_by: string;
}

export class RejectTimesheetDto {
  @IsString()
  rejection_reason: string;
}
