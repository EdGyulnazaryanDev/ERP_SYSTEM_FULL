import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  user_id: string;

  @Column()
  user_name: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  reply_to_id: string;

  @Column({ nullable: true })
  reply_to_preview: string;

  @Column({ default: false })
  is_edited: boolean;

  @Column({ default: false })
  is_deleted: boolean;

  // reactions stored as { emoji: [userId, ...] }
  @Column({ type: 'jsonb', default: {} })
  reactions: Record<string, string[]>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

@Entity('chat_read_receipts')
export class ChatReadReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  user_id: string;

  @Column({ type: 'timestamptz' })
  last_read_at: Date;
}

@Entity('chat_presence')
export class ChatPresence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  user_id: string;

  @Column()
  user_name: string;

  @Column({ type: 'timestamptz' })
  last_seen_at: Date;

  @Column({ default: false })
  is_typing: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  typing_at: Date;
}
