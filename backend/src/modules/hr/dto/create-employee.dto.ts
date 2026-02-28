import { IsString, IsEmail, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { EmploymentStatus, EmploymentType } from '../entities/employee.entity';

export class CreateEmployeeDto {
  @IsString()
  employee_code: string;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

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

  @IsString()
  department: string;

  @IsString()
  position: string;

  @IsOptional()
  @IsString()
  manager_id?: string;

  @IsDateString()
  hire_date: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employment_type?: EmploymentType;

  @IsOptional()
  @IsEnum(EmploymentStatus)
  status?: EmploymentStatus;

  @IsOptional()
  @IsNumber()
  salary?: number;

  @IsOptional()
  @IsString()
  bank_account?: string;

  @IsOptional()
  @IsString()
  bank_name?: string;

  @IsOptional()
  @IsString()
  tax_id?: string;

  @IsOptional()
  @IsString()
  social_security?: string;

  @IsOptional()
  @IsString()
  emergency_contact?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
