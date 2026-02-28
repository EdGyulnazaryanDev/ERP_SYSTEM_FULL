import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';
import {
  MaintenanceType,
  MaintenanceStatus,
} from '../entities/maintenance-record.entity';
import { MaintenanceFrequency } from '../entities/maintenance-schedule.entity';

export class CreateMaintenanceScheduleDto {
  @IsUUID()
  asset_id: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MaintenanceFrequency)
  frequency: MaintenanceFrequency;

  @IsDateString()
  start_date: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsNumber()
  estimated_hours?: number;

  @IsOptional()
  @IsNumber()
  estimated_cost?: number;

  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMaintenanceScheduleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  next_due_date?: string;

  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMaintenanceRecordDto {
  @IsUUID()
  asset_id: string;

  @IsOptional()
  @IsUUID()
  schedule_id?: string;

  @IsEnum(MaintenanceType)
  maintenance_type: MaintenanceType;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  scheduled_date: string;

  @IsOptional()
  @IsUUID()
  performed_by?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompleteMaintenanceDto {
  @IsDateString()
  start_time: string;

  @IsDateString()
  end_time: string;

  @IsNumber()
  actual_hours: number;

  @IsNumber()
  labor_cost: number;

  @IsNumber()
  parts_cost: number;

  @IsOptional()
  @IsString()
  work_performed?: string;

  @IsOptional()
  @IsString()
  parts_used?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
