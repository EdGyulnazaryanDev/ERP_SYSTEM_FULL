import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsArray } from 'class-validator';
import { QuoteStatus } from '../entities/quote.entity';

export class QuoteItemInput {
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  tax_rate?: number;
  total: number;
}

export class CreateQuoteDto {
  @IsString()
  quote_number: string;

  @IsString()
  customer_id: string;

  @IsOptional()
  @IsString()
  opportunity_id?: string;

  @IsDateString()
  quote_date: string;

  @IsDateString()
  valid_until: string;

  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @IsOptional()
  @IsNumber()
  tax_rate?: number;

  @IsOptional()
  @IsNumber()
  discount_amount?: number;

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
  items: QuoteItemInput[];
}

export class UpdateQuoteDto {
  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsString()
  opportunity_id?: string;

  @IsOptional()
  @IsDateString()
  quote_date?: string;

  @IsOptional()
  @IsDateString()
  valid_until?: string;

  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @IsOptional()
  @IsNumber()
  tax_rate?: number;

  @IsOptional()
  @IsNumber()
  discount_amount?: number;

  @IsOptional()
  @IsString()
  terms_conditions?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  items?: QuoteItemInput[];
}
