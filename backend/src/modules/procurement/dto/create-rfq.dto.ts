import { IsString, IsDateString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { RfqStatus } from '../entities/rfq.entity';

export class RfqItemInput {
  product_id?: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit?: string;
  specifications?: string;
}

export class CreateRfqDto {
  @IsString()
  rfq_number: string;

  @IsDateString()
  rfq_date: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(RfqStatus)
  status?: RfqStatus;

  @IsDateString()
  submission_deadline: string;

  @IsArray()
  vendor_ids: string[];

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
  items: RfqItemInput[];
}

export class UpdateRfqDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(RfqStatus)
  status?: RfqStatus;

  @IsOptional()
  @IsDateString()
  submission_deadline?: string;

  @IsOptional()
  @IsArray()
  vendor_ids?: string[];

  @IsOptional()
  @IsString()
  terms_conditions?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  items?: RfqItemInput[];
}
