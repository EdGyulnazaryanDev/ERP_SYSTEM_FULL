import { IsString, IsEnum, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { ChannelType } from '../entities/channel.entity';

export class CreateChannelDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ChannelType)
  channel_type: ChannelType;

  @IsString()
  @IsOptional()
  avatar_url?: string;

  @IsBoolean()
  @IsOptional()
  is_default?: boolean;

  @IsArray()
  @IsOptional()
  member_ids?: string[];
}

export class UpdateChannelDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  avatar_url?: string;
}

export class AddChannelMemberDto {
  @IsArray()
  user_ids: string[];

  @IsString()
  @IsOptional()
  role?: string;
}
