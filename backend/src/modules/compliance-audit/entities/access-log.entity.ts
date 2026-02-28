import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

export enum AccessType {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  EXPORT = 'export',
  PRINT = 'print',
}

export enum AccessResult {
  GRANTED = 'granted',
  DENIED = 'denied',
  FAILED = 'failed',
}

@Entity('access_logs')
export class AccessLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column({ nullable: true })
  user_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: AccessType })
  access_type: AccessType;

  @Column()
  resource_type: string;

  @Column({ nullable: true })
  resource_id: string;

  @Column({ type: 'enum', enum: AccessResult })
  result: AccessResult;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ nullable: true })
  ip_address: string;

  @Column({ nullable: true })
  user_agent: string;

  @Column({ nullable: true })
  session_id: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  accessed_at: Date;
}
