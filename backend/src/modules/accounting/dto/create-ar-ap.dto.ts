import { IsString, IsNumber, IsDateString, IsOptional, IsUUID, IsEnum } from 'class-validator';

export enum ARAPStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export class CreateAccountReceivableDto {
  @IsUUID()
  customer_id: string;

  @IsString()
  invoice_number: string;

  @IsDateString()
  invoice_date: string;

  @IsDateString()
  due_date: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  paid_amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateAccountPayableDto {
  @IsUUID()
  supplier_id: string;

  @IsString()
  bill_number: string;

  @IsDateString()
  bill_date: string;

  @IsDateString()
  due_date: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  paid_amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class RecordPaymentDto {
  @IsNumber()
  payment_amount: number;

  @IsDateString()
  payment_date: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}
