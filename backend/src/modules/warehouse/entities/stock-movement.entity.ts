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
import { InventoryEntity } from '../../inventory/entities/inventory.entity';

export enum MovementType {
  RECEIPT = 'RECEIPT',   // stock coming IN (purchase/return)
  ISSUE = 'ISSUE',       // stock going OUT (sale/consumption)
  TRANSFER = 'TRANSFER', // between locations
  ADJUSTMENT = 'ADJUSTMENT', // manual correction
}

@Entity('stock_movements')
@Index(['tenant_id', 'movement_number'], { unique: true })
@Index(['tenant_id', 'movement_date'])
export class StockMovementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 100 })
  movement_number: string;

  @Column({ type: 'uuid', nullable: true })
  product_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  product_name: string;

  @ManyToOne(() => InventoryEntity, { nullable: true, eager: false, createForeignKeyConstraints: false })
  @JoinColumn({ name: 'product_id', referencedColumnName: 'id' })
  inventory: InventoryEntity;

  @Column({ type: 'uuid', nullable: true })
  courier_id: string;

  @Column({ type: 'uuid', nullable: true })
  shipment_id: string;

  @Column({ type: 'enum', enum: MovementType })
  movement_type: MovementType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  from_location: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  to_location: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  unit_cost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_cost: number;

  @Column({ type: 'date' })
  movement_date: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference_document: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: false })
  journal_entry_created: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
