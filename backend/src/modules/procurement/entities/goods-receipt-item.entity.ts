import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GoodsReceiptEntity } from './goods-receipt.entity';

export enum ItemQualityStatus {
  PENDING = 'pending',
  PASSED = 'passed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

@Entity('goods_receipt_items')
export class GoodsReceiptItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  goods_receipt_id: string;

  @ManyToOne(() => GoodsReceiptEntity, (grn) => grn.items)
  @JoinColumn({ name: 'goods_receipt_id' })
  goods_receipt: GoodsReceiptEntity;

  @Column({ type: 'uuid' })
  po_item_id: string;

  @Column({ type: 'uuid', nullable: true })
  product_id: string;

  @Column({ type: 'varchar', length: 255 })
  product_name: string;

  @Column({ type: 'int' })
  quantity_ordered: number;

  @Column({ type: 'int' })
  quantity_received: number;

  @Column({ type: 'int', default: 0 })
  quantity_accepted: number;

  @Column({ type: 'int', default: 0 })
  quantity_rejected: number;

  @Column({
    type: 'enum',
    enum: ItemQualityStatus,
    default: ItemQualityStatus.PENDING,
  })
  quality_status: ItemQualityStatus;

  @Column({ type: 'text', nullable: true })
  quality_notes: string;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
