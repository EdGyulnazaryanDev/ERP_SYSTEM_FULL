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

  // Optional: override which CoA accounts to use for the auto journal entry
  @IsOptional()
  @IsUUID()
  ar_account_id?: string; // Debit: Accounts Receivable account

  @IsOptional()
  @IsUUID()
  revenue_account_id?: string; // Credit: Revenue account

  @IsOptional()
  @IsUUID()
  bank_account_id?: string; // For payment: Debit Bank account
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

  // Optional: override which CoA accounts to use for the auto journal entry
  @IsOptional()
  @IsUUID()
  ap_account_id?: string; // Credit: Accounts Payable account

  @IsOptional()
  @IsUUID()
  expense_account_id?: string; // Debit: Expense account

  @IsOptional()
  @IsUUID()
  bank_account_id?: string; // For payment: Credit Bank account
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

  // Optional: which bank/cash account to use in the journal entry
  @IsOptional()
  @IsUUID()
  bank_account_id?: string;
}
