import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ReportPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

@Entity('financial_reports')
export class FinancialReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({
    type: 'enum',
    enum: ReportPeriod,
  })
  period: ReportPeriod;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_income: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_outcome: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  net_profit: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  gross_profit: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  operating_expenses: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  cost_of_goods_sold: number;

  @Column({ type: 'int', default: 0 })
  transaction_count: number;

  @Column({ type: 'int', default: 0 })
  sales_count: number;

  @Column({ type: 'int', default: 0 })
  purchase_count: number;

  @Column({ type: 'jsonb', nullable: true })
  breakdown: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
