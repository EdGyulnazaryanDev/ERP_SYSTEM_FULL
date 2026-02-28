import { IsString, IsEmail, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { LeadSource, LeadStatus } from '../entities/lead.entity';

export class CreateLeadDto {
  @IsString()
  lead_code: string;

  @IsString()
  company_name: string;

  @IsString()
  contact_person: string;

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
  position?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsNumber()
  expected_revenue?: number;

  @IsOptional()
  @IsNumber()
  probability?: number;

  @IsOptional()
  @IsString()
  assigned_to?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  next_follow_up?: string;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsString()
  contact_person?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsNumber()
  expected_revenue?: number;

  @IsOptional()
  @IsNumber()
  probability?: number;

  @IsOptional()
  @IsString()
  assigned_to?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  next_follow_up?: string;
}

export class CreateLeadActivityDto {
  @IsString()
  lead_id: string;

  @IsString()
  activity_type: string;

  @IsString()
  description: string;

  @IsDateString()
  date_time: string;

  @IsString()
  created_by: string;
}
