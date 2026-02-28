import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum QualityCheckType {
  INCOMING = 'incoming',
  IN_PROCESS = 'in_process',
  FINAL = 'final',
  RANDOM = 'random',
}

export enum QualityCheckResult {
  PASS = 'pass',
  FAIL = 'fail',
  CONDITIONAL = 'conditional',
}

@Entity('quality_checks')
export class QualityCheckEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  check_number: string;

  @Column({ type: 'uuid', nullable: true })
  work_order_id: string;

  @Column({ type: 'uuid', nullable: true })
  product_id: string;

  @Column({
    type: 'enum',
    enum: QualityCheckType,
  })
  check_type: QualityCheckType;

  @Column({ type: 'date' })
  check_date: Date;

  @Column({ type: 'uuid' })
  inspector_id: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  quantity_checked: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  quantity_passed: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  quantity_failed: number;

  @Column({
    type: 'enum',
    enum: QualityCheckResult,
  })
  result: QualityCheckResult;

  @Column({ type: 'jsonb', nullable: true })
  test_results: any;

  @Column({ type: 'text', nullable: true })
  defects_found: string;

  @Column({ type: 'text', nullable: true })
  corrective_action: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
