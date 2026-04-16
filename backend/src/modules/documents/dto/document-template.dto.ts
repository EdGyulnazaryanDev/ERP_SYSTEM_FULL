import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsJSON,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TemplateVariableDto {
  @IsString()
  name: string;

  @IsEnum(['string', 'number', 'date', 'boolean', 'object', 'array'])
  type: string;

  @IsBoolean()
  required: boolean;

  @IsOptional()
  defaultValue?: any;

  @IsOptional()
  @IsJSON()
  validation?: string;
}

export class CreateDocumentTemplateDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsEnum(['html', 'markdown', 'json', 'docx'])
  templateType: 'html' | 'markdown' | 'json' | 'docx';

  @IsString()
  templateContent: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableDto)
  variables: TemplateVariableDto[];

  @IsOptional()
  @IsArray()
  outputFormats?: string[] = ['pdf'];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class GenerateDocumentDto {
  @IsString()
  templateId: string;

  @IsJSON()
  data: string; // JSON string

  @IsOptional()
  @IsEnum(['pdf', 'docx', 'html', 'json'])
  format?: 'pdf' | 'docx' | 'html' | 'json' = 'pdf';

  @IsOptional()
  @IsString()
  language?: string = 'en';

  @IsOptional()
  @IsString()
  watermark?: string;

  @IsOptional()
  @IsBoolean()
  digitalSignature?: boolean = false;
}

export class ValidateTemplateDataDto {
  @IsString()
  templateId: string;

  @IsJSON()
  data: string;
}
