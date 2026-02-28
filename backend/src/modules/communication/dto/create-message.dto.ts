import { IsString, IsEnum, IsOptional, IsArray, IsObject } from 'class-validator';
import { MessageType } from '../entities/message.entity';

export class CreateMessageDto {
  @IsString()
  channel_id: string;

  @IsEnum(MessageType)
  @IsOptional()
  message_type?: MessageType;

  @IsString()
  content: string;

  @IsArray()
  @IsOptional()
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    mime_type: string;
  }>;

  @IsString()
  @IsOptional()
  parent_message_id?: string;

  @IsArray()
  @IsOptional()
  mentions?: string[];
}

export class UpdateMessageDto {
  @IsString()
  content: string;

  @IsArray()
  @IsOptional()
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    mime_type: string;
  }>;
}

export class AddReactionDto {
  @IsString()
  emoji: string;
}

export class MarkAsReadDto {
  @IsString()
  @IsOptional()
  message_id?: string;
}
