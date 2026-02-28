import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ReconciliationStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('bank_reconciliations')
export class BankReconciliationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  bank_account_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  reconciliation_number: string;

  @Column({ type: 'date' })
  statement_date: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  statement_balance: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  book_balance: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  difference: number;

  @Column({
    type: 'enum',
    enum: ReconciliationStatus,
    default: ReconciliationStatus.IN_PROGRESS,
  })
  status: ReconciliationStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true })
  reconciled_by: string;

  @Column({ type: 'timestamp', nullable: true })
  reconciled_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
