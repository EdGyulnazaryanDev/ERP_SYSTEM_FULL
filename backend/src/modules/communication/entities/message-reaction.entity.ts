import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { MessageEntity } from './message.entity';

@Entity('message_reactions')
export class MessageReactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  message_id: string;

  @ManyToOne(() => MessageEntity, (message) => message.reactions)
  @JoinColumn({ name: 'message_id' })
  message: MessageEntity;

  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  emoji: string;

  @CreateDateColumn()
  created_at: Date;
}
