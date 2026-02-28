import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkflowDefinitionEntity } from './workflow-definition.entity';

export enum StepType {
  START = 'start',
  END = 'end',
  TASK = 'task',
  APPROVAL = 'approval',
  CONDITION = 'condition',
  NOTIFICATION = 'notification',
  API_CALL = 'api_call',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  DELAY = 'delay',
  SCRIPT = 'script',
}

export enum StepStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  FAILED = 'failed',
}

@Entity('workflow_steps')
export class WorkflowStepEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  workflow_id: string;

  @ManyToOne(() => WorkflowDefinitionEntity, (workflow) => workflow.steps)
  @JoinColumn({ name: 'workflow_id' })
  workflow: WorkflowDefinitionEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: StepType,
  })
  step_type: StepType;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ type: 'jsonb', nullable: true })
  config: any;

  @Column({ type: 'jsonb', nullable: true })
  conditions: any;

  @Column({ type: 'uuid', nullable: true })
  next_step_id: string;

  @Column({ type: 'uuid', nullable: true })
  next_step_on_success: string;

  @Column({ type: 'uuid', nullable: true })
  next_step_on_failure: string;

  @Column({ type: 'jsonb', nullable: true })
  position: any;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  is_required: boolean;

  @Column({ type: 'int', nullable: true })
  timeout_seconds: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
