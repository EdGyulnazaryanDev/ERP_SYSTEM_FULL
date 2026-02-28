import { IsString, IsEmail, IsOptional, IsEnum, IsNumber, IsArray } from 'class-validator';
import { CustomerType, CustomerStatus } from '../entities/customer.entity';

export class CreateCustomerDto {
  @IsString()
  customer_code: string;

  @IsString()
  company_name: string;

  @IsOptional()
  @IsString()
  contact_person?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postal_code?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsEnum(CustomerType)
  customer_type?: CustomerType;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  tax_id?: string;

  @IsOptional()
  @IsNumber()
  credit_limit?: number;

  @IsOptional()
  @IsNumber()
  payment_terms?: number;

  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  assigned_to?: string;
}
