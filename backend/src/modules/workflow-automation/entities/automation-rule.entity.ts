import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RuleTrigger {
  RECORD_CREATED = 'record_created',
  RECORD_UPDATED = 'record_updated',
  RECORD_DELETED = 'record_deleted',
  FIELD_CHANGED = 'field_changed',
  SCHEDULED = 'scheduled',
  MANUAL = 'manual',
}

export enum ActionType {
  UPDATE_FIELD = 'update_field',
  SEND_EMAIL = 'send_email',
  SEND_NOTIFICATION = 'send_notification',
  CREATE_RECORD = 'create_record',
  CALL_WEBHOOK = 'call_webhook',
  START_WORKFLOW = 'start_workflow',
  EXECUTE_SCRIPT = 'execute_script',
}

export enum RuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAUSED = 'paused',
}

@Entity('automation_rules')
export class AutomationRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  entity_type: string;

  @Column({
    type: 'enum',
    enum: RuleTrigger,
  })
  trigger: RuleTrigger;

  @Column({ type: 'jsonb', nullable: true })
  conditions: any;

  @Column({
    type: 'enum',
    enum: ActionType,
  })
  action_type: ActionType;

  @Column({ type: 'jsonb' })
  action_config: any;

  @Column({
    type: 'enum',
    enum: RuleStatus,
    default: RuleStatus.ACTIVE,
  })
  status: RuleStatus;

  @Column({ type: 'int', default: 0 })
  execution_count: number;

  @Column({ type: 'timestamp', nullable: true })
  last_executed_at: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @Column({ type: 'boolean', default: false })
  run_async: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
