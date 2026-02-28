import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkflowInstanceEntity } from './workflow-instance.entity';

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('workflow_tasks')
export class WorkflowTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  instance_id: string;

  @ManyToOne(() => WorkflowInstanceEntity, (instance) => instance.tasks)
  @JoinColumn({ name: 'instance_id' })
  instance: WorkflowInstanceEntity;

  @Column({ type: 'uuid' })
  step_id: string;

  @Column({ type: 'varchar', length: 255 })
  task_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.NORMAL,
  })
  priority: TaskPriority;

  @Column({ type: 'uuid', nullable: true })
  assigned_to: string;

  @Column({ type: 'uuid', nullable: true })
  assigned_role: string;

  @Column({ type: 'timestamp', nullable: true })
  due_date: Date;

  @Column({ type: 'jsonb', nullable: true })
  task_data: any;

  @Column({ type: 'jsonb', nullable: true })
  result_data: any;

  @Column({ type: 'uuid', nullable: true })
  completed_by: string;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
