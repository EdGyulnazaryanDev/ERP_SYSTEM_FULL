import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import {
  RuleTrigger,
  ActionType,
  RuleStatus,
} from '../entities/automation-rule.entity';

export class CreateAutomationRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  entity_type: string;

  @IsEnum(RuleTrigger)
  trigger: RuleTrigger;

  @IsOptional()
  @IsObject()
  conditions?: any;

  @IsEnum(ActionType)
  action_type: ActionType;

  @IsObject()
  action_config: any;

  @IsOptional()
  @IsBoolean()
  run_async?: boolean;

  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class UpdateAutomationRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(RuleStatus)
  status?: RuleStatus;

  @IsOptional()
  @IsObject()
  conditions?: any;

  @IsOptional()
  @IsObject()
  action_config?: any;
}

export class ExecuteAutomationDto {
  @IsObject()
  entity_data: any;

  @IsOptional()
  @IsObject()
  context?: any;
}
