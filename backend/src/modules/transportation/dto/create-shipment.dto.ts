import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShipmentPriority } from '../entities/shipment.entity';

export class ShipmentItemDto {
  @IsUUID()
  @IsOptional()
  product_id?: string;

  @IsString()
  product_name: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateShipmentDto {
  @IsUUID()
  @IsOptional()
  transaction_id?: string;

  @IsUUID()
  @IsOptional()
  courier_id?: string;

  @IsEnum(ShipmentPriority)
  @IsOptional()
  priority?: ShipmentPriority;

  // Origin
  @IsString()
  origin_name: string;

  @IsString()
  origin_address: string;

  @IsString()
  @IsOptional()
  origin_city?: string;

  @IsString()
  @IsOptional()
  origin_postal_code?: string;

  @IsString()
  @IsOptional()
  origin_phone?: string;

  // Destination
  @IsString()
  destination_name: string;

  @IsString()
  destination_address: string;

  @IsString()
  @IsOptional()
  destination_city?: string;

  @IsString()
  @IsOptional()
  destination_postal_code?: string;

  @IsString()
  @IsOptional()
  destination_phone?: string;

  @IsNumber()
  @IsOptional()
  destination_latitude?: number;

  @IsNumber()
  @IsOptional()
  destination_longitude?: number;

  // Shipment Details
  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsString()
  @IsOptional()
  weight_unit?: string;

  @IsNumber()
  @IsOptional()
  volume?: number;

  @IsNumber()
  @IsOptional()
  package_count?: number;

  @IsString()
  @IsOptional()
  package_type?: string;

  // Dates
  @IsDateString()
  @IsOptional()
  pickup_date?: string;

  @IsDateString()
  @IsOptional()
  estimated_delivery_date?: string;

  // Costs
  @IsNumber()
  @IsOptional()
  shipping_cost?: number;

  @IsNumber()
  @IsOptional()
  insurance_cost?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  special_instructions?: string;

  @IsBoolean()
  @IsOptional()
  requires_signature?: boolean;

  @IsBoolean()
  @IsOptional()
  is_fragile?: boolean;

  @IsBoolean()
  @IsOptional()
  is_insured?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentItemDto)
  items: ShipmentItemDto[];
}
