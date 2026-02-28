import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RetentionAction {
  ARCHIVE = 'archive',
  DELETE = 'delete',
  ANONYMIZE = 'anonymize',
}

export enum PolicyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
}

@Entity('data_retention_policies')
export class DataRetentionPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  policy_name: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  entity_type: string;

  @Column({ type: 'int' })
  retention_days: number;

  @Column({ type: 'enum', enum: RetentionAction })
  action: RetentionAction;

  @Column({ type: 'enum', enum: PolicyStatus, default: PolicyStatus.DRAFT })
  status: PolicyStatus;

  @Column({ type: 'jsonb', nullable: true })
  conditions: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  auto_execute: boolean;

  @Column({ nullable: true })
  execution_schedule: string; // cron expression

  @Column({ type: 'date', nullable: true })
  last_executed_at: Date;

  @Column({ type: 'int', default: 0 })
  records_processed: number;

  @Column()
  created_by: string;

  @Column({ nullable: true })
  updated_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
