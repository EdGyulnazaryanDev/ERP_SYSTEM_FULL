import { IsString, IsDateString, IsOptional, IsEnum, IsArray, IsNumber } from 'class-validator';
import { QuoteStatus } from '../entities/vendor-quote.entity';

export class VendorQuoteItemInput {
  rfq_item_id?: string;
  product_id?: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  tax_amount?: number;
  total: number;
  notes?: string;
}

export class CreateVendorQuoteDto {
  @IsString()
  rfq_id: string;

  @IsString()
  vendor_id: string;

  @IsString()
  quote_number: string;

  @IsDateString()
  quote_date: string;

  @IsDateString()
  valid_until: string;

  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @IsOptional()
  @IsNumber()
  shipping_cost?: number;

  @IsOptional()
  @IsNumber()
  delivery_days?: number;

  @IsOptional()
  @IsString()
  payment_terms?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  items: VendorQuoteItemInput[];
}

export class UpdateVendorQuoteDto {
  @IsOptional()
  @IsDateString()
  valid_until?: string;

  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @IsOptional()
  @IsNumber()
  shipping_cost?: number;

  @IsOptional()
  @IsNumber()
  delivery_days?: number;

  @IsOptional()
  @IsString()
  payment_terms?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsArray()
  items?: VendorQuoteItemInput[];
}
