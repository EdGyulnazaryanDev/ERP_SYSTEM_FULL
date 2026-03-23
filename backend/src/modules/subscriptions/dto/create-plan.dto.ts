import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlanFeature, PlanLimitKey } from '../subscription.constants';

export class PlanLimitDto {
  @IsEnum(PlanLimitKey)
  key: PlanLimitKey;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value: number | null;
}

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  monthlyPrice: number;

  @IsNumber()
  @Min(0)
  yearlyPrice: number;

  @IsBoolean()
  isActive: boolean;

  @IsArray()
  @IsEnum(PlanFeature, { each: true })
  features: PlanFeature[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanLimitDto)
  limits: PlanLimitDto[];
}
