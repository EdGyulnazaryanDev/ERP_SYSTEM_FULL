import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RuleType {
  DATA_RETENTION = 'data_retention',
  ACCESS_CONTROL = 'access_control',
  DATA_PRIVACY = 'data_privacy',
  FINANCIAL = 'financial',
  SECURITY = 'security',
  OPERATIONAL = 'operational',
}

export enum RuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
}

export enum ComplianceFramework {
  GDPR = 'gdpr',
  SOX = 'sox',
  HIPAA = 'hipaa',
  ISO27001 = 'iso27001',
  PCI_DSS = 'pci_dss',
  CUSTOM = 'custom',
}

@Entity('compliance_rules')
export class ComplianceRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column({ unique: true })
  rule_code: string;

  @Column()
  rule_name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: RuleType })
  rule_type: RuleType;

  @Column({ type: 'enum', enum: ComplianceFramework })
  framework: ComplianceFramework;

  @Column({ type: 'enum', enum: RuleStatus, default: RuleStatus.DRAFT })
  status: RuleStatus;

  @Column({ type: 'jsonb' })
  conditions: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  actions: Record<string, any>;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  auto_check: boolean;

  @Column({ nullable: true })
  check_frequency: string; // cron expression

  @Column({ type: 'date', nullable: true })
  effective_date: Date;

  @Column({ type: 'date', nullable: true })
  expiry_date: Date;

  @Column()
  created_by: string;

  @Column({ nullable: true })
  updated_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
