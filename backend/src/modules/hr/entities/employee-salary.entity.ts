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

@Entity('employee_salaries')
export class EmployeeSalaryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  employee_id: string;

  @ManyToOne(() => EmployeeEntity, (employee) => employee.salary_structures)
  @JoinColumn({ name: 'employee_id' })
  employee: EmployeeEntity;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basic_salary: number;

  @Column({ type: 'jsonb', nullable: true })
  components: {
    component_id: string;
    name: string;
    type: string;
    calculation_type: string;
    value: number;
    amount: number;
  }[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  gross_salary: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_deductions: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  net_salary: number;

  @Column({ type: 'date' })
  effective_from: Date;

  @Column({ type: 'date', nullable: true })
  effective_to: Date;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
