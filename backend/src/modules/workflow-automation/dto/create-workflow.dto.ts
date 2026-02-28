import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WorkflowTrigger,
  WorkflowStatus,
} from '../entities/workflow-definition.entity';
import { StepType } from '../entities/workflow-step.entity';

export class WorkflowStepDto {
  @IsString()
  name: string;

  @IsEnum(StepType)
  step_type: StepType;

  @IsNumber()
  sequence: number;

  @IsOptional()
  @IsObject()
  config?: any;

  @IsOptional()
  @IsObject()
  conditions?: any;

  @IsOptional()
  @IsUUID()
  next_step_id?: string;

  @IsOptional()
  @IsUUID()
  next_step_on_success?: string;

  @IsOptional()
  @IsUUID()
  next_step_on_failure?: string;

  @IsOptional()
  @IsObject()
  position?: any;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @IsOptional()
  @IsNumber()
  timeout_seconds?: number;
}

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(WorkflowTrigger)
  trigger_type: WorkflowTrigger;

  @IsOptional()
  @IsString()
  trigger_event?: string;

  @IsOptional()
  @IsObject()
  trigger_config?: any;

  @IsOptional()
  @IsObject()
  visual_config?: any;

  @IsOptional()
  @IsBoolean()
  is_template?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps?: WorkflowStepDto[];
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @IsOptional()
  @IsObject()
  visual_config?: any;
}

export class ExecuteWorkflowDto {
  @IsOptional()
  @IsObject()
  input_data?: any;

  @IsOptional()
  @IsUUID()
  triggered_by?: string;

  @IsOptional()
  @IsString()
  entity_type?: string;

  @IsOptional()
  @IsUUID()
  entity_id?: string;
}
