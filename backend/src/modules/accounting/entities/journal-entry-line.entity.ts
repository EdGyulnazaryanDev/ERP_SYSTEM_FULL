import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { JournalEntryEntity } from './journal-entry.entity';
import { ChartOfAccountEntity } from './chart-of-account.entity';

@Entity('journal_entry_lines')
export class JournalEntryLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  journal_entry_id: string;

  @ManyToOne(() => JournalEntryEntity, (entry) => entry.lines)
  @JoinColumn({ name: 'journal_entry_id' })
  journal_entry: JournalEntryEntity;

  @Column({ type: 'uuid' })
  account_id: string;

  @ManyToOne(() => ChartOfAccountEntity)
  @JoinColumn({ name: 'account_id' })
  account: ChartOfAccountEntity;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  debit: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  credit: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string;

  @Column({ type: 'int', default: 0 })
  line_number: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
