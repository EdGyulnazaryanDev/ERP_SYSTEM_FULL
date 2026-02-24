import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CourierType {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}

export enum CourierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
  SUSPENDED = 'suspended',
}

@Entity('couriers')
export class CourierEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: CourierType,
    default: CourierType.EXTERNAL,
  })
  type: CourierType;

  @Column({
    type: 'enum',
    enum: CourierStatus,
    default: CourierStatus.ACTIVE,
  })
  status: CourierStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company_name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  license_number: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  vehicle_number: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  vehicle_type: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  base_rate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  per_km_rate: number;

  @Column({ type: 'int', default: 0 })
  total_deliveries: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'jsonb', nullable: true })
  working_hours: any;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
