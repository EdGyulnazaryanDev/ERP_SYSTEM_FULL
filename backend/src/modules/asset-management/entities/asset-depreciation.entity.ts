import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AssetEntity } from './asset.entity';

export enum DepreciationMethod {
  STRAIGHT_LINE = 'straight_line',
  DECLINING_BALANCE = 'declining_balance',
  DOUBLE_DECLINING = 'double_declining',
  SUM_OF_YEARS = 'sum_of_years',
  UNITS_OF_PRODUCTION = 'units_of_production',
}

@Entity('asset_depreciations')
export class AssetDepreciationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  asset_id: string;

  @ManyToOne(() => AssetEntity)
  @JoinColumn({ name: 'asset_id' })
  asset: AssetEntity;

  @Column({
    type: 'enum',
    enum: DepreciationMethod,
    default: DepreciationMethod.STRAIGHT_LINE,
  })
  method: DepreciationMethod;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'date' })
  depreciation_date: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  opening_value: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  depreciation_amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  accumulated_depreciation: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  closing_value: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  depreciation_rate: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: false })
  is_posted: boolean;

  @Column({ type: 'uuid', nullable: true })
  journal_entry_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
