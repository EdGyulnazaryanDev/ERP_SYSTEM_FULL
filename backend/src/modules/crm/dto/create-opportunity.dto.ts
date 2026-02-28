import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsArray } from 'class-validator';
import { OpportunityStage } from '../entities/opportunity.entity';

export class OpportunityProductInput {
  product_id?: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  total: number;
}

export class CreateOpportunityDto {
  @IsString()
  opportunity_code: string;

  @IsString()
  customer_id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  probability?: number;

  @IsOptional()
  @IsDateString()
  expected_close_date?: string;

  @IsOptional()
  @IsString()
  assigned_to?: string;

  @IsOptional()
  @IsString()
  competitors?: string;

  @IsOptional()
  @IsString()
  next_step?: string;

  @IsOptional()
  @IsArray()
  products?: OpportunityProductInput[];
}

export class UpdateOpportunityDto {
  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  probability?: number;

  @IsOptional()
  @IsDateString()
  expected_close_date?: string;

  @IsOptional()
  @IsString()
  assigned_to?: string;

  @IsOptional()
  @IsString()
  competitors?: string;

  @IsOptional()
  @IsString()
  next_step?: string;

  @IsOptional()
  @IsString()
  loss_reason?: string;
}
