import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReportTemplateEntity } from './report-template.entity';
import { ReportFormat } from './report-template.entity';

export enum ReportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('saved_reports')
export class SavedReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  template_id: string;

  @ManyToOne(() => ReportTemplateEntity)
  @JoinColumn({ name: 'template_id' })
  template: ReportTemplateEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: ReportFormat,
  })
  format: ReportFormat;

  @Column({ type: 'jsonb', nullable: true })
  parameters: any;

  @Column({ type: 'jsonb', nullable: true })
  filters: any;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_path: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_url: string;

  @Column({ type: 'int', nullable: true })
  file_size: number;

  @Column({ type: 'int', default: 0 })
  row_count: number;

  @Column({ type: 'uuid' })
  generated_by: string;

  @Column({ type: 'timestamp', nullable: true })
  generated_at: Date;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
