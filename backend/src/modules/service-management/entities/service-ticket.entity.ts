import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TicketCategoryEntity } from './ticket-category.entity';

export enum TicketStatus {
  NEW = 'new',
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical',
}

export enum TicketChannel {
  EMAIL = 'email',
  PHONE = 'phone',
  WEB = 'web',
  CHAT = 'chat',
  MOBILE = 'mobile',
  WALK_IN = 'walk_in',
}

@Entity('service_tickets')
export class ServiceTicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  ticket_number: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.NEW,
  })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  priority: TicketPriority;

  @Column({
    type: 'enum',
    enum: TicketChannel,
    default: TicketChannel.WEB,
  })
  channel: TicketChannel;

  @Column({ type: 'uuid', nullable: true })
  category_id: string;

  @ManyToOne(() => TicketCategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category: TicketCategoryEntity;

  @Column({ type: 'uuid', nullable: true })
  customer_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  customer_phone: string;

  @Column({ type: 'uuid', nullable: true })
  assigned_to: string;

  @Column({ type: 'uuid', nullable: true })
  assigned_team: string;

  @Column({ type: 'uuid', nullable: true })
  sla_policy_id: string;

  @Column({ type: 'timestamp', nullable: true })
  due_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  first_response_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date;

  @Column({ type: 'int', default: 0 })
  response_time_minutes: number;

  @Column({ type: 'int', default: 0 })
  resolution_time_minutes: number;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  resolution_notes: string;

  @Column({ type: 'int', nullable: true })
  satisfaction_rating: number;

  @Column({ type: 'text', nullable: true })
  satisfaction_feedback: string;

  @Column({ type: 'text', nullable: true })
  trello_card_id: string | null;

  @Column({ type: 'text', nullable: true })
  trello_card_url: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
