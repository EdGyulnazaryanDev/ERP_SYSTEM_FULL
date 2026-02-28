import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ReportCategory {
  FINANCIAL = 'financial',
  SALES = 'sales',
  INVENTORY = 'inventory',
  HR = 'hr',
  OPERATIONS = 'operations',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  HTML = 'html',
  JSON = 'json',
}

@Entity('report_templates')
export class ReportTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ReportCategory,
  })
  category: ReportCategory;

  @Column({ type: 'text' })
  query: string;

  @Column({ type: 'jsonb', nullable: true })
  parameters: any;

  @Column({ type: 'jsonb', nullable: true })
  columns: any;

  @Column({ type: 'jsonb', nullable: true })
  filters: any;

  @Column({ type: 'jsonb', nullable: true })
  sorting: any;

  @Column({ type: 'jsonb', nullable: true })
  grouping: any;

  @Column({ type: 'jsonb', nullable: true })
  aggregations: any;

  @Column({
    type: 'enum',
    enum: ReportFormat,
    array: true,
    default: [ReportFormat.PDF, ReportFormat.EXCEL],
  })
  supported_formats: ReportFormat[];

  @Column({ type: 'uuid' })
  created_by: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_system: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
