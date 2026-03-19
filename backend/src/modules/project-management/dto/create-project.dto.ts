import { IsString, IsEnum, IsOptional, IsDateString, IsNumber, IsArray, IsUUID } from 'class-validator';
import { ProjectStatus, ProjectPriority } from '../entities/project.entity';

export class CreateProjectDto {
  @IsOptional()
  @IsString()
  project_code?: string;

  @IsString()
  project_name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsUUID()
  project_manager_id: string;

  @IsDateString()
  start_date: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsNumber()
  estimated_budget?: number;

  @IsOptional()
  @IsNumber()
  estimated_hours?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  progress_percentage?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  project_name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsOptional()
  @IsUUID()
  project_manager_id?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsDateString()
  actual_end_date?: string;

  @IsOptional()
  @IsNumber()
  estimated_budget?: number;

  @IsOptional()
  @IsNumber()
  actual_cost?: number;

  @IsOptional()
  @IsNumber()
  estimated_hours?: number;

  @IsOptional()
  @IsNumber()
  actual_hours?: number;

  @IsOptional()
  @IsNumber()
  progress_percentage?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
