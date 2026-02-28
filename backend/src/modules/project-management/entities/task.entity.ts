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
import { ProjectEntity } from './project.entity';
import { TaskDependencyEntity } from './task-dependency.entity';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('tasks')
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  project_id: string;

  @ManyToOne(() => ProjectEntity, (project) => project.tasks)
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Column({ type: 'varchar', length: 50, unique: true })
  task_code: string;

  @Column({ type: 'varchar', length: 255 })
  task_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ type: 'uuid', nullable: true })
  assigned_to: string;

  @Column({ type: 'uuid', nullable: true })
  milestone_id: string;

  @Column({ type: 'uuid', nullable: true })
  parent_task_id: string;

  @ManyToOne(() => TaskEntity, { nullable: true })
  @JoinColumn({ name: 'parent_task_id' })
  parent_task: TaskEntity;

  @Column({ type: 'date', nullable: true })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  due_date: Date;

  @Column({ type: 'date', nullable: true })
  completed_date: Date;

  @Column({ type: 'int', default: 0 })
  estimated_hours: number;

  @Column({ type: 'int', default: 0 })
  actual_hours: number;

  @Column({ type: 'int', default: 0 })
  progress_percentage: number;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @OneToMany(() => TaskDependencyEntity, (dep) => dep.task)
  dependencies: TaskDependencyEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
