import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateAssetCategoryDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  depreciation_rate?: number;

  @IsOptional()
  @IsNumber()
  useful_life_years?: number;
}

export class UpdateAssetCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  depreciation_rate?: number;

  @IsOptional()
  @IsNumber()
  useful_life_years?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
