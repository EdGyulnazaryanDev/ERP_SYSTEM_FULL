import { IsString, IsNumber, IsDateString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { PaymentType, PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsEnum(PaymentType)
  payment_type: PaymentType;

  @IsDateString()
  payment_date: string;

  @IsNumber()
  amount: number;

  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsOptional()
  @IsUUID()
  bank_account_id?: string;

  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsOptional()
  @IsUUID()
  supplier_id?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  check_number?: string;
}
