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

export enum PayslipStatus {
  DRAFT = 'draft',
  PROCESSED = 'processed',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('payslips')
export class PayslipEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  employee_id: string;

  @ManyToOne(() => EmployeeEntity, (employee) => employee.payslips)
  @JoinColumn({ name: 'employee_id' })
  employee: EmployeeEntity;

  @Column({ type: 'varchar', length: 50, unique: true })
  payslip_number: string;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'date' })
  pay_period_start: Date;

  @Column({ type: 'date' })
  pay_period_end: Date;

  @Column({ type: 'int', default: 0 })
  working_days: number;

  @Column({ type: 'int', default: 0 })
  present_days: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  leave_days: number;

  @Column({ type: 'jsonb', nullable: true })
  earnings: {
    component_id: string;
    name: string;
    amount: number;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  deductions: {
    component_id: string;
    name: string;
    amount: number;
  }[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  gross_salary: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_deductions: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  net_salary: number;

  @Column({ type: 'date', nullable: true })
  payment_date: Date;

  @Column({
    type: 'enum',
    enum: PayslipStatus,
    default: PayslipStatus.DRAFT,
  })
  status: PayslipStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
