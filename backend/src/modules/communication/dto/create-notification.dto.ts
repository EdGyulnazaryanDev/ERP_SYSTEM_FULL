import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsString()
  user_id: string;

  @IsEnum(NotificationType)
  notification_type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsString()
  @IsOptional()
  related_entity_type?: string;

  @IsString()
  @IsOptional()
  related_entity_id?: string;

  @IsString()
  @IsOptional()
  action_url?: string;
}
