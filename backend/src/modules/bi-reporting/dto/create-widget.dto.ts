import { IsString, IsOptional, IsEnum, IsNumber, IsObject, IsUUID } from 'class-validator';
import { WidgetType, ChartType } from '../entities/dashboard-widget.entity';

export class CreateWidgetDto {
  @IsUUID()
  dashboard_id: string;

  @IsString()
  title: string;

  @IsEnum(WidgetType)
  widget_type: WidgetType;

  @IsOptional()
  @IsEnum(ChartType)
  chart_type?: ChartType;

  @IsOptional()
  @IsString()
  data_source?: string;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsObject()
  config?: any;

  @IsOptional()
  @IsObject()
  position?: any;

  @IsOptional()
  @IsObject()
  size?: any;

  @IsOptional()
  @IsNumber()
  refresh_interval?: number;

  @IsOptional()
  @IsNumber()
  sort_order?: number;
}

export class UpdateWidgetDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  data_source?: string;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsObject()
  config?: any;

  @IsOptional()
  @IsObject()
  position?: any;

  @IsOptional()
  @IsObject()
  size?: any;

  @IsOptional()
  @IsNumber()
  refresh_interval?: number;

  @IsOptional()
  @IsNumber()
  sort_order?: number;
}
