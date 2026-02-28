import { IsString, IsDateString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { AttendanceStatus } from '../entities/attendance.entity';

export class CreateAttendanceDto {
  @IsString()
  employee_id: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  clock_in_time?: string;

  @IsOptional()
  @IsString()
  clock_out_time?: string;

  @IsOptional()
  @IsNumber()
  work_hours?: number;

  @IsOptional()
  @IsNumber()
  overtime_hours?: number;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ClockInDto {
  @IsString()
  employee_id: string;
}

export class ClockOutDto {
  @IsString()
  employee_id: string;
}
