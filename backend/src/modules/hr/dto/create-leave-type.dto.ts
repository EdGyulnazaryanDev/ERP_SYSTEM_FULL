import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateLeaveTypeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  days_allowed: number;

  @IsOptional()
  @IsBoolean()
  carry_forward?: boolean;

  @IsOptional()
  @IsNumber()
  max_carry_forward_days?: number;

  @IsOptional()
  @IsBoolean()
  requires_approval?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateLeaveTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  days_allowed?: number;

  @IsOptional()
  @IsBoolean()
  carry_forward?: boolean;

  @IsOptional()
  @IsNumber()
  max_carry_forward_days?: number;

  @IsOptional()
  @IsBoolean()
  requires_approval?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
