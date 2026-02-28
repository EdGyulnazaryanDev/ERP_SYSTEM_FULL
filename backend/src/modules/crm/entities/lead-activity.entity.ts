import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LeadEntity } from './lead.entity';

export enum LeadActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  NOTE = 'note',
  STATUS_CHANGE = 'status_change',
}

@Entity('lead_activities')
export class LeadActivityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  lead_id: string;

  @ManyToOne(() => LeadEntity, (lead) => lead.activities)
  @JoinColumn({ name: 'lead_id' })
  lead: LeadEntity;

  @Column({
    type: 'enum',
    enum: LeadActivityType,
  })
  activity_type: LeadActivityType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'timestamp' })
  date_time: Date;

  @Column({ type: 'uuid' })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
