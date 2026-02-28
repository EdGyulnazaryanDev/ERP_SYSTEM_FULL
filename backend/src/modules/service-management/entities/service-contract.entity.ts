import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ContractStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  RENEWED = 'renewed',
}

export enum ContractType {
  MAINTENANCE = 'maintenance',
  SUPPORT = 'support',
  WARRANTY = 'warranty',
  SLA = 'sla',
}

export enum BillingFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUAL = 'semi_annual',
  ANNUAL = 'annual',
  ONE_TIME = 'one_time',
}

@Entity('service_contracts')
export class ServiceContractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  contract_number: string;

  @Column({ type: 'varchar', length: 255 })
  contract_name: string;

  @Column({
    type: 'enum',
    enum: ContractType,
  })
  contract_type: ContractType;

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.DRAFT,
  })
  status: ContractStatus;

  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  @Column({
    type: 'enum',
    enum: BillingFrequency,
  })
  billing_frequency: BillingFrequency;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  contract_value: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  covered_services: string[];

  @Column({ type: 'int', nullable: true })
  included_service_hours: number;

  @Column({ type: 'int', default: 0 })
  used_service_hours: number;

  @Column({ type: 'boolean', default: true })
  auto_renew: boolean;

  @Column({ type: 'int', default: 30 })
  renewal_notice_days: number;

  @Column({ type: 'text', nullable: true })
  terms_and_conditions: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
