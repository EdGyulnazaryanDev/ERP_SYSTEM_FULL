import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PurchaseRequisitionEntity } from './purchase-requisition.entity';

@Entity('purchase_requisition_items')
export class PurchaseRequisitionItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  requisition_id: string;

  @ManyToOne(() => PurchaseRequisitionEntity, (requisition) => requisition.items)
  @JoinColumn({ name: 'requisition_id' })
  requisition: PurchaseRequisitionEntity;

  @Column({ type: 'uuid', nullable: true })
  product_id: string;

  @Column({ type: 'varchar', length: 255 })
  product_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimated_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total_estimated: number;

  @Column({ type: 'text', nullable: true })
  specifications: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
