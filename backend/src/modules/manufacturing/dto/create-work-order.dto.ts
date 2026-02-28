import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WorkOrderStatus,
  WorkOrderPriority,
} from '../entities/work-order.entity';
import { OperationStatus } from '../entities/work-order-operation.entity';

export class WorkOrderOperationDto {
  @IsNumber()
  sequence: number;

  @IsString()
  operation_name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  workstation_id?: string;

  @IsNumber()
  setup_time_hours: number;

  @IsNumber()
  run_time_hours: number;

  @IsOptional()
  @IsUUID()
  operator_id?: string;
}

export class CreateWorkOrderDto {
  @IsUUID()
  product_id: string;

  @IsOptional()
  @IsUUID()
  bom_id?: string;

  @IsNumber()
  quantity_planned: number;

  @IsString()
  unit_of_measure: string;

  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @IsDateString()
  planned_start_date: string;

  @IsDateString()
  planned_end_date: string;

  @IsOptional()
  @IsUUID()
  production_line_id?: string;

  @IsOptional()
  @IsUUID()
  supervisor_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderOperationDto)
  operations?: WorkOrderOperationDto[];
}

export class UpdateWorkOrderDto {
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @IsOptional()
  @IsDateString()
  planned_start_date?: string;

  @IsOptional()
  @IsDateString()
  planned_end_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordProductionDto {
  @IsNumber()
  quantity_produced: number;

  @IsOptional()
  @IsNumber()
  quantity_scrapped?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class StartOperationDto {
  @IsUUID()
  operator_id: string;
}

export class CompleteOperationDto {
  @IsNumber()
  actual_time_hours: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
