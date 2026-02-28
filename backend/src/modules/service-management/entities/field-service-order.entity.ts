import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ServiceOrderStatus {
  SCHEDULED = 'scheduled',
  EN_ROUTE = 'en_route',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ServiceOrderType {
  INSTALLATION = 'installation',
  MAINTENANCE = 'maintenance',
  REPAIR = 'repair',
  INSPECTION = 'inspection',
  CONSULTATION = 'consultation',
}

@Entity('field_service_orders')
export class FieldServiceOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  order_number: string;

  @Column({ type: 'uuid', nullable: true })
  ticket_id: string;

  @Column({
    type: 'enum',
    enum: ServiceOrderType,
  })
  service_type: ServiceOrderType;

  @Column({
    type: 'enum',
    enum: ServiceOrderStatus,
    default: ServiceOrderStatus.SCHEDULED,
  })
  status: ServiceOrderStatus;

  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ type: 'uuid' })
  assigned_technician: string;

  @Column({ type: 'timestamp' })
  scheduled_start: Date;

  @Column({ type: 'timestamp' })
  scheduled_end: Date;

  @Column({ type: 'timestamp', nullable: true })
  actual_start: Date;

  @Column({ type: 'timestamp', nullable: true })
  actual_end: Date;

  @Column({ type: 'text' })
  service_address: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'text', nullable: true })
  work_description: string;

  @Column({ type: 'text', nullable: true })
  completion_notes: string;

  @Column({ type: 'jsonb', nullable: true })
  parts_used: Array<{
    product_id: string;
    quantity: number;
    description: string;
  }>;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  labor_hours: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_cost: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  customer_signature_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
