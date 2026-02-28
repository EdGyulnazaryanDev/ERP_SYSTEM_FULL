import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';

export enum ResourceRole {
  PROJECT_MANAGER = 'project_manager',
  TEAM_LEAD = 'team_lead',
  DEVELOPER = 'developer',
  DESIGNER = 'designer',
  QA = 'qa',
  ANALYST = 'analyst',
  CONSULTANT = 'consultant',
  OTHER = 'other',
}

@Entity('project_resources')
export class ProjectResourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  project_id: string;

  @ManyToOne(() => ProjectEntity, (project) => project.resources)
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Column({ type: 'uuid' })
  employee_id: string;

  @Column({
    type: 'enum',
    enum: ResourceRole,
    default: ResourceRole.DEVELOPER,
  })
  role: ResourceRole;

  @Column({ type: 'date' })
  allocation_start_date: Date;

  @Column({ type: 'date', nullable: true })
  allocation_end_date: Date;

  @Column({ type: 'int', default: 100 })
  allocation_percentage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  hourly_rate: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
