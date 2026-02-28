import { IsString, IsDateString, IsOptional, IsEnum, IsArray, IsNumber } from 'class-validator';
import { RequisitionStatus, RequisitionPriority } from '../entities/purchase-requisition.entity';

export class PurchaseRequisitionItemInput {
  product_id?: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit?: string;
  estimated_price?: number;
  total_estimated?: number;
  specifications?: string;
}

export class CreatePurchaseRequisitionDto {
  @IsString()
  requisition_number: string;

  @IsDateString()
  requisition_date: string;

  @IsString()
  requested_by: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEnum(RequisitionStatus)
  status?: RequisitionStatus;

  @IsOptional()
  @IsEnum(RequisitionPriority)
  priority?: RequisitionPriority;

  @IsOptional()
  @IsDateString()
  required_by_date?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  items: PurchaseRequisitionItemInput[];
}

export class UpdatePurchaseRequisitionDto {
  @IsOptional()
  @IsDateString()
  requisition_date?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEnum(RequisitionStatus)
  status?: RequisitionStatus;

  @IsOptional()
  @IsEnum(RequisitionPriority)
  priority?: RequisitionPriority;

  @IsOptional()
  @IsDateString()
  required_by_date?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  items?: PurchaseRequisitionItemInput[];
}

export class ApproveRequisitionDto {
  @IsString()
  approved_by: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectRequisitionDto {
  @IsString()
  rejection_reason: string;
}
