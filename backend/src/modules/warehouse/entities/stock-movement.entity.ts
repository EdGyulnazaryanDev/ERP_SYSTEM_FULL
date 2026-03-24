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
  RECEIPT = 'RECEIPT',       // stock coming IN (purchase/return)
  ISSUE = 'ISSUE',           // stock going OUT (sale/consumption)
  TRANSFER = 'TRANSFER',     // between locations
  ADJUSTMENT = 'ADJUSTMENT', // manual correction
}

export enum MovementStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXECUTED = 'EXECUTED',
}

@Entity('stock_movements')
@Index(['tenant_id', 'movement_number'], { unique: true })
@Index(['tenant_id', 'movement_date'])
@Index(['tenant_id', 'status'])
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

  /**
   * Lifecycle status — begins as PENDING_APPROVAL.
   * Transitions: PENDING_APPROVAL → APPROVED (manager approves) → EXECUTED (inventory/JE/AP/AR done)
   *              PENDING_APPROVAL → REJECTED
   */
  @Column({
    type: 'enum',
    enum: MovementStatus,
    default: MovementStatus.PENDING_APPROVAL,
  })
  status: MovementStatus;

  /** Links this movement to the auto-created purchase requisition number */
  @Column({ type: 'varchar', length: 100, nullable: true })
  requisition_number: string;

  /** User who submitted the movement request */
  @Column({ type: 'uuid', nullable: true })
  requested_by: string;

  /** Manager who approved or rejected */
  @Column({ type: 'uuid', nullable: true })
  approved_by: string;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

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

  /** Set when an AP bill is created for RECEIPT movements */
  @Column({ type: 'uuid', nullable: true })
  payable_id: string;

  /** Set when an AR invoice is created for ISSUE movements */
  @Column({ type: 'uuid', nullable: true })
  receivable_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
