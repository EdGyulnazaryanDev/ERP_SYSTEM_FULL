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
import { CourierEntity } from './courier.entity';
import { ShipmentItemEntity } from './shipment-item.entity';

export enum ShipmentStatus {
  PENDING = 'pending',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
}

export enum ShipmentPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('shipments')
export class ShipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  tracking_number: string;

  @Column({ type: 'uuid', nullable: true })
  transaction_id: string;

  @Column({ type: 'uuid', nullable: true })
  courier_id: string;

  @ManyToOne(() => CourierEntity)
  @JoinColumn({ name: 'courier_id' })
  courier: CourierEntity;

  @Column({
    type: 'enum',
    enum: ShipmentStatus,
    default: ShipmentStatus.PENDING,
  })
  status: ShipmentStatus;

  @Column({
    type: 'enum',
    enum: ShipmentPriority,
    default: ShipmentPriority.NORMAL,
  })
  priority: ShipmentPriority;

  // Origin
  @Column({ type: 'varchar', length: 255 })
  origin_name: string;

  @Column({ type: 'text' })
  origin_address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  origin_city: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  origin_postal_code: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  origin_phone: string;

  // Destination
  @Column({ type: 'varchar', length: 255 })
  destination_name: string;

  @Column({ type: 'text' })
  destination_address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  destination_city: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  destination_postal_code: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  destination_phone: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  destination_latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  destination_longitude: number;

  // Shipment Details
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  weight: number;

  @Column({ type: 'varchar', length: 20, default: 'kg' })
  weight_unit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  volume: number;

  @Column({ type: 'int', default: 1 })
  package_count: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  package_type: string;

  // Dates
  @Column({ type: 'timestamp', nullable: true })
  pickup_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  estimated_delivery_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  actual_delivery_date: Date;

  // Costs
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shipping_cost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  insurance_cost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_cost: number;

  // Delivery
  @Column({ type: 'varchar', length: 255, nullable: true })
  delivered_to: string;

  @Column({ type: 'text', nullable: true })
  delivery_signature: string;

  @Column({ type: 'jsonb', nullable: true })
  delivery_photos: string[];

  @Column({ type: 'text', nullable: true })
  delivery_notes: string;

  // Tracking
  @Column({ type: 'jsonb', nullable: true })
  tracking_history: any[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  special_instructions: string;

  @Column({ type: 'boolean', default: false })
  requires_signature: boolean;

  @Column({ type: 'boolean', default: false })
  is_fragile: boolean;

  @Column({ type: 'boolean', default: false })
  is_insured: boolean;

  @OneToMany(() => ShipmentItemEntity, (item) => item.shipment, {
    cascade: true,
  })
  items: ShipmentItemEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
