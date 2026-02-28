import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import type { ComplianceFramework } from './compliance-rule.entity';

export enum ReportType {
  AUDIT_SUMMARY = 'audit_summary',
  COMPLIANCE_STATUS = 'compliance_status',
  VIOLATION_REPORT = 'violation_report',
  ACCESS_REPORT = 'access_report',
  DATA_PRIVACY = 'data_privacy',
  CUSTOM = 'custom',
}

export enum ReportStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('compliance_reports')
export class ComplianceReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  report_name: string;

  @Column({ type: 'enum', enum: ReportType })
  report_type: ReportType;

  @Column({ nullable: true })
  framework: string;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.GENERATING })
  status: ReportStatus;

  @Column({ type: 'jsonb', nullable: true })
  filters: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  summary: Record<string, any>;

  @Column({ nullable: true })
  file_path: string;

  @Column({ nullable: true })
  file_size: number;

  @Column()
  generated_by: string;

  @CreateDateColumn()
  generated_at: Date;
}
