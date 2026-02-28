import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ComplianceRuleEntity } from './compliance-rule.entity';

export enum CheckStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  WARNING = 'warning',
  SKIPPED = 'skipped',
}

export enum CheckTrigger {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  EVENT_BASED = 'event_based',
  API = 'api',
}

@Entity('compliance_checks')
export class ComplianceCheckEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  rule_id: string;

  @ManyToOne(() => ComplianceRuleEntity)
  @JoinColumn({ name: 'rule_id' })
  rule: ComplianceRuleEntity;

  @Column({ type: 'enum', enum: CheckStatus })
  status: CheckStatus;

  @Column({ type: 'enum', enum: CheckTrigger })
  trigger: CheckTrigger;

  @Column({ type: 'text', nullable: true })
  result_message: string;

  @Column({ type: 'jsonb', nullable: true })
  result_data: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  violations_count: number;

  @Column({ type: 'jsonb', nullable: true })
  violations: Record<string, any>[];

  @Column({ type: 'int', nullable: true })
  execution_time_ms: number;

  @Column({ nullable: true })
  checked_by: string;

  @CreateDateColumn()
  checked_at: Date;
}
