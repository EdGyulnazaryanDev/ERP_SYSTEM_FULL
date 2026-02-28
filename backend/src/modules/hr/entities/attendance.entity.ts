import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EmployeeEntity } from './employee.entity';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  HALF_DAY = 'half_day',
  ON_LEAVE = 'on_leave',
}

@Entity('attendances')
export class AttendanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  employee_id: string;

  @ManyToOne(() => EmployeeEntity, (employee) => employee.attendances)
  @JoinColumn({ name: 'employee_id' })
  employee: EmployeeEntity;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time', nullable: true })
  clock_in_time: string;

  @Column({ type: 'time', nullable: true })
  clock_out_time: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  work_hours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  overtime_hours: number;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
