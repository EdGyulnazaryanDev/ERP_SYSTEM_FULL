import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ExportType {
  REPORT = 'report',
  DATA = 'data',
  DASHBOARD = 'dashboard',
  CUSTOM = 'custom',
}

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('data_export_logs')
export class DataExportLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({
    type: 'enum',
    enum: ExportType,
  })
  export_type: ExportType;

  @Column({ type: 'varchar', length: 255 })
  entity_name: string;

  @Column({ type: 'varchar', length: 50 })
  format: string;

  @Column({ type: 'jsonb', nullable: true })
  filters: any;

  @Column({ type: 'int', default: 0 })
  record_count: number;

  @Column({
    type: 'enum',
    enum: ExportStatus,
    default: ExportStatus.PENDING,
  })
  status: ExportStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_path: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_url: string;

  @Column({ type: 'int', nullable: true })
  file_size: number;

  @Column({ type: 'uuid' })
  exported_by: string;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'int', nullable: true })
  duration_seconds: number;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
