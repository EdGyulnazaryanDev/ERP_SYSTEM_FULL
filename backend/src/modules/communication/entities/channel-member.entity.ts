import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { ChannelEntity } from './channel.entity';

export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest',
}

export enum MemberStatus {
  ACTIVE = 'active',
  MUTED = 'muted',
  BANNED = 'banned',
  LEFT = 'left',
}

@Entity('channel_members')
export class ChannelMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  channel_id: string;

  @ManyToOne(() => ChannelEntity)
  @JoinColumn({ name: 'channel_id' })
  channel: ChannelEntity;

  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: MemberRole, default: MemberRole.MEMBER })
  role: MemberRole;

  @Column({ type: 'enum', enum: MemberStatus, default: MemberStatus.ACTIVE })
  status: MemberStatus;

  @Column({ type: 'timestamp', nullable: true })
  last_read_at: Date;

  @Column({ type: 'int', default: 0 })
  unread_count: number;

  @Column({ type: 'boolean', default: true })
  notifications_enabled: boolean;

  @Column({ nullable: true })
  added_by: string;

  @CreateDateColumn()
  joined_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
