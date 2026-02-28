import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsUUID,
  IsDateString,
} from 'class-validator';
import {
  TaskStatus,
  TaskPriority,
} from '../entities/workflow-task.entity';

export class CompleteTaskDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsOptional()
  @IsObject()
  result_data?: any;

  @IsOptional()
  @IsString()
  comments?: string;
}

export class AssignTaskDto {
  @IsUUID()
  assigned_to: string;

  @IsOptional()
  @IsString()
  comments?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsString()
  comments?: string;
}
