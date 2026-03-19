import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MovementType {
  RECEIPT = 'RECEIPT',
  ISSUE = 'ISSUE',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('stock_movements')
@Index(['tenant_id', 'movement_number'], { unique: true })
@Index(['tenant_id', 'movement_date'])
export class StockMovementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  // unique per tenant, not globally
  @Column({ type: 'varchar', length: 100 })
  movement_number: string;

  @Column({ type: 'uuid', nullable: true })
  product_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  product_name: string;

  @Column({ type: 'uuid', nullable: true })
  courier_id: string;

  @Column({ type: 'enum', enum: MovementType })
  movement_type: MovementType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  from_location: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  to_location: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'date' })
  movement_date: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference_document: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
