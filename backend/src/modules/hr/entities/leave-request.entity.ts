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
import { LeaveTypeEntity } from './leave-type.entity';

export enum LeaveRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('leave_requests')
export class LeaveRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  employee_id: string;

  @ManyToOne(() => EmployeeEntity, (employee) => employee.leave_requests)
  @JoinColumn({ name: 'employee_id' })
  employee: EmployeeEntity;

  @Column({ type: 'uuid' })
  leave_type_id: string;

  @ManyToOne(() => LeaveTypeEntity, (leaveType) => leaveType.leave_requests)
  @JoinColumn({ name: 'leave_type_id' })
  leave_type: LeaveTypeEntity;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  days_count: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'enum',
    enum: LeaveRequestStatus,
    default: LeaveRequestStatus.PENDING,
  })
  status: LeaveRequestStatus;

  @Column({ type: 'uuid', nullable: true })
  approver_id: string;

  @Column({ type: 'timestamp', nullable: true })
  approval_date: Date;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
