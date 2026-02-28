import { IsString, IsDateString, IsOptional, IsEnum, IsArray, IsNumber } from 'class-validator';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';

export class PurchaseOrderItemInput {
  product_id?: string;
  product_name: string;
  description?: string;
  quantity_ordered: number;
  unit?: string;
  unit_price: number;
  discount?: number;
  tax_amount?: number;
  total: number;
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @IsString()
  po_number: string;

  @IsString()
  vendor_id: string;

  @IsDateString()
  order_date: string;

  @IsOptional()
  @IsDateString()
  expected_delivery_date?: string;

  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsString()
  requisition_id?: string;

  @IsOptional()
  @IsString()
  rfq_id?: string;

  @IsOptional()
  @IsString()
  vendor_quote_id?: string;

  @IsOptional()
  @IsNumber()
  tax_rate?: number;

  @IsOptional()
  @IsNumber()
  shipping_cost?: number;

  @IsOptional()
  @IsNumber()
  discount_amount?: number;

  @IsOptional()
  @IsString()
  payment_terms?: string;

  @IsOptional()
  @IsString()
  shipping_address?: string;

  @IsOptional()
  @IsString()
  billing_address?: string;

  @IsOptional()
  @IsString()
  terms_conditions?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  created_by?: string;

  @IsArray()
  items: PurchaseOrderItemInput[];
}

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsDateString()
  expected_delivery_date?: string;

  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsNumber()
  tax_rate?: number;

  @IsOptional()
  @IsNumber()
  shipping_cost?: number;

  @IsOptional()
  @IsNumber()
  discount_amount?: number;

  @IsOptional()
  @IsString()
  payment_terms?: string;

  @IsOptional()
  @IsString()
  shipping_address?: string;

  @IsOptional()
  @IsString()
  billing_address?: string;

  @IsOptional()
  @IsString()
  terms_conditions?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  items?: PurchaseOrderItemInput[];
}

export class ApprovePurchaseOrderDto {
  @IsString()
  approved_by: string;
}
