import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CustomerEntity } from './customer.entity';

export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  TASK = 'task',
  NOTE = 'note',
}

export enum ActivityStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum RelatedToType {
  CUSTOMER = 'customer',
  LEAD = 'lead',
  OPPORTUNITY = 'opportunity',
}

@Entity('activities')
export class ActivityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({
    type: 'enum',
    enum: RelatedToType,
  })
  related_to: RelatedToType;

  @Column({ type: 'uuid' })
  related_id: string;

  @ManyToOne(() => CustomerEntity, (customer) => customer.activities, { nullable: true })
  @JoinColumn({ name: 'related_id' })
  customer: CustomerEntity;

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  activity_type: ActivityType;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  start_date_time: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_date_time: Date;

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.PLANNED,
  })
  status: ActivityStatus;

  @Column({ type: 'uuid' })
  assigned_to: string;

  @Column({ type: 'text', nullable: true })
  outcome: string;

  @Column({ type: 'text', nullable: true })
  next_action: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
