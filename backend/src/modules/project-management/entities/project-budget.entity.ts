import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BudgetCategory {
  LABOR = 'labor',
  MATERIALS = 'materials',
  EQUIPMENT = 'equipment',
  TRAVEL = 'travel',
  SUBCONTRACTOR = 'subcontractor',
  OVERHEAD = 'overhead',
  OTHER = 'other',
}

@Entity('project_budgets')
export class ProjectBudgetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  project_id: string;

  @Column({
    type: 'enum',
    enum: BudgetCategory,
  })
  category: BudgetCategory;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  budgeted_amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  actual_amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  committed_amount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
