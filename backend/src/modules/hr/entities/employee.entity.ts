import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AttendanceEntity } from './attendance.entity';
import { LeaveRequestEntity } from './leave-request.entity';
import { LeaveBalanceEntity } from './leave-balance.entity';
import { EmployeeSalaryEntity } from './employee-salary.entity';
import { PayslipEntity } from './payslip.entity';

export enum EmploymentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
  TERMINATED = 'terminated',
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern',
}

@Entity('employees')
export class EmployeeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  employee_code: string;

  @Column({ type: 'varchar', length: 100 })
  first_name: string;

  @Column({ type: 'varchar', length: 100 })
  last_name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postal_code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 100 })
  department: string;

  @Column({ type: 'varchar', length: 100 })
  position: string;

  @Column({ type: 'uuid', nullable: true })
  manager_id: string;

  @Column({ type: 'date' })
  hire_date: Date;

  @Column({ type: 'date', nullable: true })
  termination_date: Date;

  @Column({
    type: 'enum',
    enum: EmploymentType,
    default: EmploymentType.FULL_TIME,
  })
  employment_type: EmploymentType;

  @Column({
    type: 'enum',
    enum: EmploymentStatus,
    default: EmploymentStatus.ACTIVE,
  })
  status: EmploymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  salary: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bank_account: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bank_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tax_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  social_security: string;

  @Column({ type: 'text', nullable: true })
  emergency_contact: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => AttendanceEntity, (attendance) => attendance.employee)
  attendances: AttendanceEntity[];

  @OneToMany(() => LeaveRequestEntity, (leave) => leave.employee)
  leave_requests: LeaveRequestEntity[];

  @OneToMany(() => LeaveBalanceEntity, (balance) => balance.employee)
  leave_balances: LeaveBalanceEntity[];

  @OneToMany(() => EmployeeSalaryEntity, (salary) => salary.employee)
  salary_structures: EmployeeSalaryEntity[];

  @OneToMany(() => PayslipEntity, (payslip) => payslip.employee)
  payslips: PayslipEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
