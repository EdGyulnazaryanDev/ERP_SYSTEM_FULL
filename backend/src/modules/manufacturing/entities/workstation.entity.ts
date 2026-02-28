import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum WorkstationStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
  BREAKDOWN = 'breakdown',
  OFFLINE = 'offline',
}

@Entity('workstations')
export class WorkstationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  workstation_code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string;

  @Column({
    type: 'enum',
    enum: WorkstationStatus,
    default: WorkstationStatus.AVAILABLE,
  })
  status: WorkstationStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  capacity_per_hour: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  efficiency_percentage: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  hourly_cost: number;

  @Column({ type: 'text', nullable: true })
  capabilities: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
