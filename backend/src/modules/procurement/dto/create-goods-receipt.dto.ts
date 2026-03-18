import { IsString, IsDateString, IsOptional, IsEnum, IsArray, IsNumber } from 'class-validator';
import { GoodsReceiptStatus } from '../entities/goods-receipt.entity';
import { ItemQualityStatus } from '../entities/goods-receipt-item.entity';

export class GoodsReceiptItemInput {
  po_item_id: string;
  product_id?: string;
  product_name: string;
  quantity_ordered: number;
  quantity_received: number;
  quantity_accepted?: number;
  quantity_rejected?: number;
  quality_status?: ItemQualityStatus;
  quality_notes?: string;
  rejection_reason?: string;
}

export class CreateGoodsReceiptDto {
  @IsString()
  grn_number: string;

  @IsString()
  purchase_order_id: string;

  @IsDateString()
  receipt_date: string;

  @IsOptional()
  @IsEnum(GoodsReceiptStatus)
  status?: GoodsReceiptStatus;

  @IsOptional()
  @IsString()
  delivery_note_number?: string;

  @IsOptional()
  @IsString()
  vehicle_number?: string;

  @IsOptional()
  @IsString()
  received_by?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  items: GoodsReceiptItemInput[];
}

export class UpdateGoodsReceiptDto {
  @IsOptional()
  @IsDateString()
  receipt_date?: string;

  @IsOptional()
  @IsEnum(GoodsReceiptStatus)
  status?: GoodsReceiptStatus;

  @IsOptional()
  @IsString()
  delivery_note_number?: string;

  @IsOptional()
  @IsString()
  vehicle_number?: string;

  @IsOptional()
  @IsString()
  received_by?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  quality_check_notes?: string;

  @IsOptional()
  @IsArray()
  items?: GoodsReceiptItemInput[];
}

export class ApproveGoodsReceiptDto {
  @IsString()
  approved_by: string;

  @IsOptional()
  @IsString()
  quality_check_notes?: string;
}
