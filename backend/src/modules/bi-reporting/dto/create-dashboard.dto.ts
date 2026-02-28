import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsObject, IsArray } from 'class-validator';
import { DashboardVisibility } from '../entities/dashboard.entity';

export class CreateDashboardDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(DashboardVisibility)
  visibility?: DashboardVisibility;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsObject()
  layout?: any;

  @IsOptional()
  @IsObject()
  filters?: any;
}

export class UpdateDashboardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(DashboardVisibility)
  visibility?: DashboardVisibility;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsObject()
  layout?: any;

  @IsOptional()
  @IsObject()
  filters?: any;
}
