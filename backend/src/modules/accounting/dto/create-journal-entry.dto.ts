import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsNumber, IsDateString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { JournalEntryType } from '../entities/journal-entry.entity';

export class JournalEntryLineDto {
  @IsUUID()
  account_id: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  debit: number;

  @IsNumber()
  credit: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateJournalEntryDto {
  @IsDateString()
  entry_date: string;

  @IsOptional()
  @IsEnum(JournalEntryType)
  entry_type?: JournalEntryType;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  lines: JournalEntryLineDto[];

  @IsOptional()
  @IsUUID()
  created_by?: string;
}

export class PostJournalEntryDto {
  @IsUUID()
  posted_by: string;
}

export class ReverseJournalEntryDto {
  @IsDateString()
  reversal_date: string;

  @IsUUID()
  reversed_by: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
