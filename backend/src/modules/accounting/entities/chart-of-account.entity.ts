import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum AccountSubType {
  // Assets
  CURRENT_ASSET = 'current_asset',
  FIXED_ASSET = 'fixed_asset',
  CASH = 'cash',
  BANK = 'bank',
  ACCOUNTS_RECEIVABLE = 'accounts_receivable',
  INVENTORY = 'inventory',
  
  // Liabilities
  CURRENT_LIABILITY = 'current_liability',
  LONG_TERM_LIABILITY = 'long_term_liability',
  ACCOUNTS_PAYABLE = 'accounts_payable',
  
  // Equity
  CAPITAL = 'capital',
  RETAINED_EARNINGS = 'retained_earnings',
  
  // Revenue
  SALES_REVENUE = 'sales_revenue',
  SERVICE_REVENUE = 'service_revenue',
  OTHER_INCOME = 'other_income',
  
  // Expense
  COST_OF_GOODS_SOLD = 'cost_of_goods_sold',
  OPERATING_EXPENSE = 'operating_expense',
  ADMINISTRATIVE_EXPENSE = 'administrative_expense',
}

@Entity('chart_of_accounts')
@Index(['tenant_id', 'account_code'], { unique: true })
export class ChartOfAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50 })
  account_code: string;

  @Column({ type: 'varchar', length: 255 })
  account_name: string;

  @Column({
    type: 'enum',
    enum: AccountType,
  })
  account_type: AccountType;

  @Column({
    type: 'enum',
    enum: AccountSubType,
  })
  account_sub_type: AccountSubType;

  @Column({ type: 'uuid', nullable: true })
  parent_account_id: string;

  @ManyToOne(() => ChartOfAccountEntity, { nullable: true })
  @JoinColumn({ name: 'parent_account_id' })
  parent_account: ChartOfAccountEntity;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  opening_balance: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  current_balance: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_system_account: boolean;

  @Column({ type: 'int', default: 0 })
  level: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
