import { IsString, IsEnum, IsOptional, IsUUID, IsDateString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceOrderStatus, ServiceOrderType } from '../entities/field-service-order.entity';

export class PartUsedDto {
  @IsUUID()
  product_id: string;

  @IsNumber()
  quantity: number;

  @IsString()
  description: string;
}

export class CreateFieldServiceOrderDto {
  @IsOptional()
  @IsUUID()
  ticket_id?: string;

  @IsEnum(ServiceOrderType)
  service_type: ServiceOrderType;

  @IsUUID()
  customer_id: string;

  @IsUUID()
  assigned_technician: string;

  @IsDateString()
  scheduled_start: string;

  @IsDateString()
  scheduled_end: string;

  @IsString()
  service_address: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  work_description?: string;
}

export class UpdateFieldServiceOrderDto {
  @IsOptional()
  @IsEnum(ServiceOrderStatus)
  status?: ServiceOrderStatus;

  @IsOptional()
  @IsUUID()
  assigned_technician?: string;

  @IsOptional()
  @IsDateString()
  scheduled_start?: string;

  @IsOptional()
  @IsDateString()
  scheduled_end?: string;

  @IsOptional()
  @IsDateString()
  actual_start?: string;

  @IsOptional()
  @IsDateString()
  actual_end?: string;

  @IsOptional()
  @IsString()
  work_description?: string;

  @IsOptional()
  @IsString()
  completion_notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartUsedDto)
  parts_used?: PartUsedDto[];

  @IsOptional()
  @IsNumber()
  labor_hours?: number;

  @IsOptional()
  @IsNumber()
  total_cost?: number;

  @IsOptional()
  @IsString()
  customer_signature_url?: string;
}
