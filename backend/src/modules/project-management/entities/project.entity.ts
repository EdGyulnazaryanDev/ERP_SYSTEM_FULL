import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TaskEntity } from './task.entity';
import { ProjectResourceEntity } from './project-resource.entity';
import { MilestoneEntity } from './milestone.entity';

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('projects')
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  project_code: string;

  @Column({ type: 'varchar', length: 255 })
  project_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING,
  })
  status: ProjectStatus;

  @Column({
    type: 'enum',
    enum: ProjectPriority,
    default: ProjectPriority.MEDIUM,
  })
  priority: ProjectPriority;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string;

  @Column({ type: 'uuid' })
  project_manager_id: string;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date: Date;

  @Column({ type: 'date', nullable: true })
  actual_end_date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimated_budget: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  actual_cost: number;

  @Column({ type: 'int', default: 0 })
  estimated_hours: number;

  @Column({ type: 'int', default: 0 })
  actual_hours: number;

  @Column({ type: 'int', default: 0 })
  progress_percentage: number;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => TaskEntity, (task) => task.project)
  tasks: TaskEntity[];

  @OneToMany(() => MilestoneEntity, (milestone) => milestone.project)
  milestones: MilestoneEntity[];

  @OneToMany(() => ProjectResourceEntity, (resource) => resource.project)
  resources: ProjectResourceEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
