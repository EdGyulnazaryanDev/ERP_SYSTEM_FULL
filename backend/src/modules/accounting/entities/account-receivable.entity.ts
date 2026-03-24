import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ARStatus {
  OPEN = 'open',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  WRITTEN_OFF = 'written_off',
  REJECTED = 'rejected',
}

export enum ARApprovalStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum ARPostingStatus {
  UNPOSTED = 'unposted',
  POSTED = 'posted',
}

export enum ARAcknowledgementStatus {
  PENDING = 'pending',
  SIGNED = 'signed',
  REJECTED = 'rejected',
}

@Entity('accounts_receivable')
@Index(['tenant_id', 'invoice_number'], { unique: true })
export class AccountReceivableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50 })
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

  @Column({
    type: 'enum',
    enum: ARApprovalStatus,
    default: ARApprovalStatus.DRAFT,
  })
  approval_status: ARApprovalStatus;

  @Column({
    type: 'enum',
    enum: ARPostingStatus,
    default: ARPostingStatus.UNPOSTED,
  })
  posting_status: ARPostingStatus;

  @Column({
    type: 'enum',
    enum: ARAcknowledgementStatus,
    default: ARAcknowledgementStatus.PENDING,
  })
  acknowledgement_status: ARAcknowledgementStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true })
  journal_entry_id: string;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date;

  @Column({ type: 'text', nullable: true })
  approval_notes: string;

  @Column({ type: 'uuid', nullable: true })
  posted_by: string;

  @Column({ type: 'timestamp', nullable: true })
  posted_at: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  signed_by_name: string;

  @Column({ type: 'timestamp', nullable: true })
  signed_at: Date;

  @Column({ type: 'text', nullable: true })
  signing_notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
