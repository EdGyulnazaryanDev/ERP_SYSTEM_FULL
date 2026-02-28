import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { ChannelEntity } from './channel.entity';
import { MessageReactionEntity } from './message-reaction.entity';

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  SYSTEM = 'system',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  DELETED = 'deleted',
  EDITED = 'edited',
}

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  channel_id: string;

  @ManyToOne(() => ChannelEntity, (channel) => channel.messages)
  @JoinColumn({ name: 'channel_id' })
  channel: ChannelEntity;

  @Column()
  sender_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  message_type: MessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    mime_type: string;
  }>;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.SENT })
  status: MessageStatus;

  @Column({ nullable: true })
  parent_message_id: string;

  @ManyToOne(() => MessageEntity, { nullable: true })
  @JoinColumn({ name: 'parent_message_id' })
  parent_message: MessageEntity;

  @OneToMany(() => MessageReactionEntity, (reaction) => reaction.message)
  reactions: MessageReactionEntity[];

  @Column({ type: 'jsonb', nullable: true })
  mentions: string[];

  @Column({ type: 'boolean', default: false })
  is_pinned: boolean;

  @Column({ type: 'boolean', default: false })
  is_edited: boolean;

  @Column({ type: 'timestamp', nullable: true })
  edited_at: Date;

  @Column({ type: 'int', default: 0 })
  reply_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
