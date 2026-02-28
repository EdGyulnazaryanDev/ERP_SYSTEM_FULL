import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MessageEntity } from './message.entity';
import { ChannelEntity } from './channel.entity';

@Entity('threads')
export class ThreadEntity {
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
  parent_message_id: string;

  @ManyToOne(() => MessageEntity)
  @JoinColumn({ name: 'parent_message_id' })
  parent_message: MessageEntity;

  @Column({ type: 'int', default: 0 })
  reply_count: number;

  @Column({ type: 'int', default: 0 })
  participant_count: number;

  @Column({ type: 'jsonb', nullable: true })
  participants: string[];

  @Column({ type: 'timestamp', nullable: true })
  last_reply_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
