import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
  IsUUID,
} from 'class-validator';
import { PlanStatus } from '../entities/production-plan.entity';

export class CreateProductionPlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsOptional()
  @IsObject()
  demand_forecast?: any;

  @IsOptional()
  @IsObject()
  capacity_plan?: any;

  @IsOptional()
  @IsObject()
  material_requirements?: any;
}

export class UpdateProductionPlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  @IsOptional()
  @IsObject()
  demand_forecast?: any;
}

export class ApproveProductionPlanDto {
  @IsUUID()
  approved_by: string;
}
