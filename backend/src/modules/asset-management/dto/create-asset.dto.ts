import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { AssetStatus, AssetCondition } from '../entities/asset.entity';

export class CreateAssetDto {
  @IsString()
  asset_code: string;

  @IsString()
  name: string;

  @IsUUID()
  category_id: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  serial_number?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsNumber()
  purchase_cost: number;

  @IsDateString()
  purchase_date: string;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  warranty_expiry?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @IsOptional()
  @IsUUID()
  location_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AssignAssetDto {
  @IsUUID()
  assigned_to: string;

  @IsDateString()
  assigned_date: string;
}

export class TransferAssetDto {
  @IsUUID()
  location_id: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
