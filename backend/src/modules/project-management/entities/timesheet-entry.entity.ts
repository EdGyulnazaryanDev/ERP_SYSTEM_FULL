import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TimesheetEntity } from './timesheet.entity';

@Entity('timesheet_entries')
export class TimesheetEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  timesheet_id: string;

  @ManyToOne(() => TimesheetEntity, (timesheet) => timesheet.entries)
  @JoinColumn({ name: 'timesheet_id' })
  timesheet: TimesheetEntity;

  @Column({ type: 'uuid' })
  project_id: string;

  @Column({ type: 'uuid', nullable: true })
  task_id: string;

  @Column({ type: 'date' })
  work_date: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  hours: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  is_billable: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
