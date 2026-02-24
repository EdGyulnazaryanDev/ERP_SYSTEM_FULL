import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, PaymentMethod } from '../entities/transaction.entity';

export class TransactionItemDto {
  @IsUUID()
  product_id: string;

  @IsString()
  product_name: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unit_price: number;

  @IsNumber()
  @IsOptional()
  discount_amount?: number;

  @IsNumber()
  @IsOptional()
  tax_amount?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsUUID()
  @IsOptional()
  customer_id?: string;

  @IsString()
  @IsOptional()
  customer_name?: string;

  @IsUUID()
  @IsOptional()
  supplier_id?: string;

  @IsString()
  @IsOptional()
  supplier_name?: string;

  @IsDateString()
  transaction_date: string;

  @IsDateString()
  @IsOptional()
  due_date?: string;

  @IsNumber()
  @IsOptional()
  tax_rate?: number;

  @IsNumber()
  @IsOptional()
  discount_amount?: number;

  @IsNumber()
  @IsOptional()
  shipping_amount?: number;

  @IsNumber()
  @IsOptional()
  paid_amount?: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  payment_method?: PaymentMethod;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  terms?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items: TransactionItemDto[];
}
