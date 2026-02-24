import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CourierEntity } from './courier.entity';

export enum RouteStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('delivery_routes')
export class DeliveryRouteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  route_number: string;

  @Column({ type: 'uuid' })
  courier_id: string;

  @ManyToOne(() => CourierEntity)
  @JoinColumn({ name: 'courier_id' })
  courier: CourierEntity;

  @Column({
    type: 'enum',
    enum: RouteStatus,
    default: RouteStatus.PLANNED,
  })
  status: RouteStatus;

  @Column({ type: 'date' })
  route_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  start_time: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_time: Date;

  @Column({ type: 'jsonb' })
  shipment_ids: string[];

  @Column({ type: 'int', default: 0 })
  total_stops: number;

  @Column({ type: 'int', default: 0 })
  completed_stops: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_distance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimated_duration: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  actual_duration: number;

  @Column({ type: 'jsonb', nullable: true })
  route_coordinates: any[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
