import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RfqItemEntity } from './rfq-item.entity';
import { VendorQuoteEntity } from './vendor-quote.entity';

export enum RfqStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  RESPONSES_RECEIVED = 'responses_received',
  EVALUATED = 'evaluated',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

@Entity('rfqs')
export class RfqEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  rfq_number: string;

  @Column({ type: 'date' })
  rfq_date: Date;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: RfqStatus,
    default: RfqStatus.DRAFT,
  })
  status: RfqStatus;

  @Column({ type: 'date' })
  submission_deadline: Date;

  @Column({ type: 'jsonb', nullable: true })
  vendor_ids: string[];

  @Column({ type: 'text', nullable: true })
  terms_conditions: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @OneToMany(() => RfqItemEntity, (item) => item.rfq, { cascade: true })
  items: RfqItemEntity[];

  @OneToMany(() => VendorQuoteEntity, (quote) => quote.rfq)
  vendor_quotes: VendorQuoteEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
