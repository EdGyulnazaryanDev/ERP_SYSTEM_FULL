import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ComponentType {
  EARNING = 'earning',
  DEDUCTION = 'deduction',
}

export enum CalculationType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
}

@Entity('salary_components')
export class SalaryComponentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ComponentType,
  })
  type: ComponentType;

  @Column({
    type: 'enum',
    enum: CalculationType,
  })
  calculation_type: CalculationType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  value: number;

  @Column({ type: 'boolean', default: false })
  is_taxable: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
