import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AssetCategoryEntity } from './asset-category.entity';

export enum AssetStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  UNDER_MAINTENANCE = 'under_maintenance',
  RETIRED = 'retired',
  DISPOSED = 'disposed',
}

export enum AssetCondition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

@Entity('assets')
export class AssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  asset_code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'uuid' })
  category_id: string;

  @ManyToOne(() => AssetCategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category: AssetCategoryEntity;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  serial_number: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  qr_code: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  purchase_cost: number;

  @Column({ type: 'date' })
  purchase_date: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  supplier: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  warranty_expiry: string;

  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.AVAILABLE,
  })
  status: AssetStatus;

  @Column({
    type: 'enum',
    enum: AssetCondition,
    default: AssetCondition.GOOD,
  })
  condition: AssetCondition;

  @Column({ type: 'uuid', nullable: true })
  location_id: string;

  @Column({ type: 'uuid', nullable: true })
  assigned_to: string;

  @Column({ type: 'date', nullable: true })
  assigned_date: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  current_value: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  accumulated_depreciation: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  image_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
