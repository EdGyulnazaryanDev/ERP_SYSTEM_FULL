import { IsString, IsEnum, IsOptional, IsDateString, IsUUID, IsInt } from 'class-validator';
import { MilestoneStatus } from '../entities/milestone.entity';

export class CreateMilestoneDto {
  @IsUUID()
  project_id: string;

  @IsString()
  milestone_name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  due_date: string;

  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @IsOptional()
  @IsInt()
  sort_order?: number;
}

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  milestone_name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsDateString()
  completed_date?: string;

  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @IsOptional()
  @IsInt()
  sort_order?: number;
}
