import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  FEE = 'fee',
  INTEREST = 'interest',
}

export enum ReconciliationStatus {
  UNRECONCILED = 'unreconciled',
  RECONCILED = 'reconciled',
  VOID = 'void',
}

@Entity('bank_transactions')
export class BankTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  bank_account_id: string;

  @Column({ type: 'date' })
  transaction_date: Date;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  transaction_type: TransactionType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  debit: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  credit: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column({
    type: 'enum',
    enum: ReconciliationStatus,
    default: ReconciliationStatus.UNRECONCILED,
  })
  reconciliation_status: ReconciliationStatus;

  @Column({ type: 'uuid', nullable: true })
  reconciliation_id: string;

  @Column({ type: 'uuid', nullable: true })
  payment_id: string;

  @Column({ type: 'uuid', nullable: true })
  journal_entry_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
