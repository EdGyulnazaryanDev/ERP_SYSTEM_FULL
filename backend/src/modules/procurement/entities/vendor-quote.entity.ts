import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { RfqEntity } from './rfq.entity';
import { VendorQuoteItemEntity } from './vendor-quote-item.entity';

export enum QuoteStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('vendor_quotes')
export class VendorQuoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  rfq_id: string;

  @ManyToOne(() => RfqEntity, (rfq) => rfq.vendor_quotes)
  @JoinColumn({ name: 'rfq_id' })
  rfq: RfqEntity;

  @Column({ type: 'uuid' })
  vendor_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  quote_number: string;

  @Column({ type: 'date' })
  quote_date: Date;

  @Column({ type: 'date' })
  valid_until: Date;

  @Column({
    type: 'enum',
    enum: QuoteStatus,
    default: QuoteStatus.PENDING,
  })
  status: QuoteStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shipping_cost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_amount: number;

  @Column({ type: 'int', nullable: true })
  delivery_days: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  payment_terms: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int', default: 0 })
  score: number;

  @OneToMany(() => VendorQuoteItemEntity, (item) => item.vendor_quote, {
    cascade: true,
  })
  items: VendorQuoteItemEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
