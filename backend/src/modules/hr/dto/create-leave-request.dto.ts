import { IsString, IsDateString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { LeaveRequestStatus } from '../entities/leave-request.entity';

export class CreateLeaveRequestDto {
  @IsString()
  leave_type_id: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsNumber()
  days_count: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveLeaveDto {
  @IsString()
  approver_id: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectLeaveDto {
  @IsString()
  approver_id: string;

  @IsString()
  rejection_reason: string;
}

export class UpdateLeaveRequestDto {
  @IsOptional()
  @IsString()
  leave_type_id?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsNumber()
  days_count?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsEnum(LeaveRequestStatus)
  status?: LeaveRequestStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
