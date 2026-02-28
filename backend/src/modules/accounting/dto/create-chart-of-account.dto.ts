import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, IsUUID } from 'class-validator';
import { AccountType, AccountSubType } from '../entities/chart-of-account.entity';

export class CreateChartOfAccountDto {
  @IsString()
  account_code: string;

  @IsString()
  account_name: string;

  @IsEnum(AccountType)
  account_type: AccountType;

  @IsEnum(AccountSubType)
  account_sub_type: AccountSubType;

  @IsOptional()
  @IsUUID()
  parent_account_id?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  opening_balance?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  level?: number;
}

export class UpdateChartOfAccountDto {
  @IsOptional()
  @IsString()
  account_name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
