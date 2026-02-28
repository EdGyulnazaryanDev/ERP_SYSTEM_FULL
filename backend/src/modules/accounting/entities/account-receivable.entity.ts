import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ARStatus {
  OPEN = 'open',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  WRITTEN_OFF = 'written_off',
}

@Entity('accounts_receivable')
export class AccountReceivableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  invoice_number: string;

  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ type: 'date' })
  invoice_date: Date;

  @Column({ type: 'date' })
  due_date: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total_amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  paid_amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance_amount: number;

  @Column({
    type: 'enum',
    enum: ARStatus,
    default: ARStatus.OPEN,
  })
  status: ARStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true })
  journal_entry_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
