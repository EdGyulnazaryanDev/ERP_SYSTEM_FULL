import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { BankAccountType } from '../entities/bank-account.entity';

export class CreateBankAccountDto {
  @IsString()
  account_name: string;

  @IsString()
  account_number: string;

  @IsString()
  bank_name: string;

  @IsOptional()
  @IsEnum(BankAccountType)
  account_type?: BankAccountType;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  swift_code?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  opening_balance?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  account_name?: string;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
