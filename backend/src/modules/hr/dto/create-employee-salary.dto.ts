import { IsString, IsNumber, IsDateString, IsOptional, IsArray } from 'class-validator';

export class SalaryComponentInput {
  component_id: string;
  name: string;
  type: string;
  calculation_type: string;
  value: number;
  amount: number;
}

export class CreateEmployeeSalaryDto {
  @IsString()
  employee_id: string;

  @IsNumber()
  basic_salary: number;

  @IsOptional()
  @IsArray()
  components?: SalaryComponentInput[];

  @IsDateString()
  effective_from: string;

  @IsOptional()
  @IsDateString()
  effective_to?: string;
}

export class UpdateEmployeeSalaryDto {
  @IsOptional()
  @IsNumber()
  basic_salary?: number;

  @IsOptional()
  @IsArray()
  components?: SalaryComponentInput[];

  @IsOptional()
  @IsDateString()
  effective_from?: string;

  @IsOptional()
  @IsDateString()
  effective_to?: string;
}
