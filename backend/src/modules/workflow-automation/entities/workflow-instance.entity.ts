import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { WorkflowDefinitionEntity } from './workflow-definition.entity';
import { WorkflowTaskEntity } from './workflow-task.entity';

export enum InstanceStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}

@Entity('workflow_instances')
export class WorkflowInstanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  workflow_id: string;

  @ManyToOne(() => WorkflowDefinitionEntity)
  @JoinColumn({ name: 'workflow_id' })
  workflow: WorkflowDefinitionEntity;

  @Column({
    type: 'enum',
    enum: InstanceStatus,
    default: InstanceStatus.RUNNING,
  })
  status: InstanceStatus;

  @Column({ type: 'uuid', nullable: true })
  current_step_id: string;

  @Column({ type: 'jsonb', nullable: true })
  context_data: any;

  @Column({ type: 'jsonb', nullable: true })
  input_data: any;

  @Column({ type: 'jsonb', nullable: true })
  output_data: any;

  @Column({ type: 'uuid', nullable: true })
  triggered_by: string;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'int', nullable: true })
  duration_seconds: number;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  entity_type: string;

  @Column({ type: 'uuid', nullable: true })
  entity_id: string;

  @OneToMany(() => WorkflowTaskEntity, (task) => task.instance, {
    cascade: true,
  })
  tasks: WorkflowTaskEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
