import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { JournalEntryLineEntity } from './journal-entry-line.entity';

export enum JournalEntryStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  REVERSED = 'reversed',
}

export enum JournalEntryType {
  GENERAL = 'general',
  SALES = 'sales',
  PURCHASE = 'purchase',
  PAYMENT = 'payment',
  RECEIPT = 'receipt',
  ADJUSTMENT = 'adjustment',
  OPENING = 'opening',
  CLOSING = 'closing',
}

@Entity('journal_entries')
export class JournalEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  entry_number: string;

  @Column({ type: 'date' })
  entry_date: Date;

  @Column({
    type: 'enum',
    enum: JournalEntryType,
    default: JournalEntryType.GENERAL,
  })
  entry_type: JournalEntryType;

  @Column({
    type: 'enum',
    enum: JournalEntryStatus,
    default: JournalEntryStatus.DRAFT,
  })
  status: JournalEntryStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_debit: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_credit: number;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @Column({ type: 'uuid', nullable: true })
  posted_by: string;

  @Column({ type: 'timestamp', nullable: true })
  posted_at: Date;

  @Column({ type: 'uuid', nullable: true })
  reversed_entry_id: string;

  @OneToMany(() => JournalEntryLineEntity, (line) => line.journal_entry, {
    cascade: true,
  })
  lines: JournalEntryLineEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
