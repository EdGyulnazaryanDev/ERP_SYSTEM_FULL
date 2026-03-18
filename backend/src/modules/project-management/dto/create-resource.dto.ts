import { IsUUID, IsEnum, IsOptional, IsDateString, IsInt, IsNumber, IsBoolean } from 'class-validator';
import { ResourceRole } from '../entities/project-resource.entity';

export class CreateResourceDto {
  @IsUUID()
  project_id: string;

  @IsUUID()
  employee_id: string;

  @IsOptional()
  @IsEnum(ResourceRole)
  role?: ResourceRole;

  @IsDateString()
  allocation_start_date: string;

  @IsOptional()
  @IsDateString()
  allocation_end_date?: string;

  @IsOptional()
  @IsInt()
  allocation_percentage?: number;

  @IsOptional()
  @IsNumber()
  hourly_rate?: number;
}

export class UpdateResourceDto {
  @IsOptional()
  @IsEnum(ResourceRole)
  role?: ResourceRole;

  @IsOptional()
  @IsDateString()
  allocation_start_date?: string;

  @IsOptional()
  @IsDateString()
  allocation_end_date?: string;

  @IsOptional()
  @IsInt()
  allocation_percentage?: number;

  @IsOptional()
  @IsNumber()
  hourly_rate?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
