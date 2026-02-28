import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { GoodsReceiptItemEntity } from './goods-receipt-item.entity';

export enum GoodsReceiptStatus {
  DRAFT = 'draft',
  RECEIVED = 'received',
  QUALITY_CHECK = 'quality_check',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('goods_receipts')
export class GoodsReceiptEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  grn_number: string;

  @Column({ type: 'uuid' })
  purchase_order_id: string;

  @Column({ type: 'date' })
  receipt_date: Date;

  @Column({
    type: 'enum',
    enum: GoodsReceiptStatus,
    default: GoodsReceiptStatus.DRAFT,
  })
  status: GoodsReceiptStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  delivery_note_number: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  vehicle_number: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  received_by: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  quality_check_notes: string;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date;

  @OneToMany(() => GoodsReceiptItemEntity, (item) => item.goods_receipt, {
    cascade: true,
  })
  items: GoodsReceiptItemEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
