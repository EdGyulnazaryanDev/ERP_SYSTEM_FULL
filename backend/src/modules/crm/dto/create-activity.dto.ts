import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ActivityType, ActivityStatus, RelatedToType } from '../entities/activity.entity';

export class CreateActivityDto {
  @IsEnum(RelatedToType)
  related_to: RelatedToType;

  @IsString()
  related_id: string;

  @IsEnum(ActivityType)
  activity_type: ActivityType;

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  start_date_time: string;

  @IsOptional()
  @IsDateString()
  end_date_time?: string;

  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @IsString()
  assigned_to: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  next_action?: string;
}

export class UpdateActivityDto {
  @IsOptional()
  @IsEnum(ActivityType)
  activity_type?: ActivityType;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  start_date_time?: string;

  @IsOptional()
  @IsDateString()
  end_date_time?: string;

  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @IsOptional()
  @IsString()
  assigned_to?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  next_action?: string;
}
