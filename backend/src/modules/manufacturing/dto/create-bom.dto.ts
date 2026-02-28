import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BomType, BomStatus } from '../entities/bill-of-materials.entity';
import { ComponentType } from '../entities/bom-component.entity';

export class BomComponentDto {
  @IsUUID()
  product_id: string;

  @IsEnum(ComponentType)
  component_type: ComponentType;

  @IsNumber()
  quantity: number;

  @IsString()
  unit_of_measure: string;

  @IsOptional()
  @IsNumber()
  unit_cost?: number;

  @IsOptional()
  @IsNumber()
  scrap_percentage?: number;

  @IsOptional()
  @IsNumber()
  sequence?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  is_optional?: boolean;
}

export class CreateBomDto {
  @IsString()
  name: string;

  @IsUUID()
  product_id: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  unit_of_measure?: string;

  @IsOptional()
  @IsEnum(BomType)
  bom_type?: BomType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  effective_date?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BomComponentDto)
  components: BomComponentDto[];
}

export class UpdateBomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(BomStatus)
  status?: BomStatus;
}

export class ApproveBomDto {
  @IsUUID()
  approved_by: string;
}
