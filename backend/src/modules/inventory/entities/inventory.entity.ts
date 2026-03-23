import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SupplierEntity } from '../../suppliers/supplier.entity';

@Entity('inventory')
@Index(['tenant_id', 'sku'], { unique: true })
export class InventoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  // product_id may be optional when creating ad-hoc inventory records
  @Column({ type: 'uuid', nullable: true })
  product_id: string;

  @Column({ type: 'varchar', length: 255 })
  product_name: string;

  @Column({ type: 'varchar', length: 100 })
  sku: string;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'int', default: 0 })
  reserved_quantity: number;

  @Column({ type: 'int', default: 0 })
  available_quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unit_cost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unit_price: number;

  @Column({ type: 'int', default: 10 })
  reorder_level: number;

  @Column({ type: 'int', default: 50 })
  reorder_quantity: number;

  @Column({ type: 'uuid', nullable: true })
  supplier_id: string;

  @ManyToOne(() => SupplierEntity, { nullable: true, eager: false, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'supplier_id' })
  supplier: SupplierEntity;

  @Column({ type: 'varchar', length: 255, nullable: true })
  supplier_name: string;

  @Column({ type: 'int', default: 100 })
  max_stock_level: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  warehouse: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
