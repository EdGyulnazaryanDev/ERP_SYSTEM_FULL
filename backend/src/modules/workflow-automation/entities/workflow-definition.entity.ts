import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WorkflowStepEntity } from './workflow-step.entity';

export enum WorkflowTrigger {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  EVENT = 'event',
  WEBHOOK = 'webhook',
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

@Entity('workflow_definitions')
export class WorkflowDefinitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: WorkflowTrigger,
  })
  trigger_type: WorkflowTrigger;

  @Column({ type: 'varchar', length: 255, nullable: true })
  trigger_event: string;

  @Column({ type: 'jsonb', nullable: true })
  trigger_config: any;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.DRAFT,
  })
  status: WorkflowStatus;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'jsonb', nullable: true })
  visual_config: any;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string;

  @Column({ type: 'boolean', default: false })
  is_template: boolean;

  @Column({ type: 'int', default: 0 })
  execution_count: number;

  @Column({ type: 'timestamp', nullable: true })
  last_executed_at: Date;

  @OneToMany(() => WorkflowStepEntity, (step) => step.workflow, {
    cascade: true,
  })
  steps: WorkflowStepEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
