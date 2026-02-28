import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { LeadActivityEntity } from './lead-activity.entity';

export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  CAMPAIGN = 'campaign',
  SOCIAL_MEDIA = 'social_media',
  COLD_CALL = 'cold_call',
  TRADE_SHOW = 'trade_show',
  OTHER = 'other',
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
}

@Entity('leads')
export class LeadEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  lead_code: string;

  @Column({ type: 'varchar', length: 255 })
  company_name: string;

  @Column({ type: 'varchar', length: 100 })
  contact_person: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mobile: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  position: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string;

  @Column({
    type: 'enum',
    enum: LeadSource,
    default: LeadSource.OTHER,
  })
  source: LeadSource;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.NEW,
  })
  status: LeadStatus;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  expected_revenue: number;

  @Column({ type: 'int', default: 0 })
  probability: number;

  @Column({ type: 'uuid', nullable: true })
  assigned_to: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true })
  next_follow_up: Date;

  @Column({ type: 'uuid', nullable: true })
  converted_customer_id: string;

  @Column({ type: 'timestamp', nullable: true })
  converted_at: Date;

  @OneToMany(() => LeadActivityEntity, (activity) => activity.lead)
  activities: LeadActivityEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
