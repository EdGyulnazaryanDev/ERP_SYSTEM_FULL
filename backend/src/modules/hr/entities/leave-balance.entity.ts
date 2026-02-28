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

@Entity('leave_balances')
export class LeaveBalanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  employee_id: string;

  @ManyToOne(() => EmployeeEntity, (employee) => employee.leave_balances)
  @JoinColumn({ name: 'employee_id' })
  employee: EmployeeEntity;

  @Column({ type: 'uuid' })
  leave_type_id: string;

  @ManyToOne(() => LeaveTypeEntity, (leaveType) => leaveType.leave_balances)
  @JoinColumn({ name: 'leave_type_id' })
  leave_type: LeaveTypeEntity;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  total_days: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  used_days: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  remaining_days: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  carried_forward: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
