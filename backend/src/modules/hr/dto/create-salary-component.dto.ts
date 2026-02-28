import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ComponentType, CalculationType } from '../entities/salary-component.entity';

export class CreateSalaryComponentDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ComponentType)
  type: ComponentType;

  @IsEnum(CalculationType)
  calculation_type: CalculationType;

  @IsNumber()
  value: number;

  @IsOptional()
  @IsBoolean()
  is_taxable?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  sort_order?: number;
}

export class UpdateSalaryComponentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ComponentType)
  type?: ComponentType;

  @IsOptional()
  @IsEnum(CalculationType)
  calculation_type?: CalculationType;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsBoolean()
  is_taxable?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  sort_order?: number;
}
