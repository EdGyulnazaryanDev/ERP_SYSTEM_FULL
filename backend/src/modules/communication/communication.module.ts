import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationController } from './communication.controller';
import { CommunicationService } from './communication.service';
import { ChannelEntity } from './entities/channel.entity';
import { MessageEntity } from './entities/message.entity';
import { ChannelMemberEntity } from './entities/channel-member.entity';
import { MessageReactionEntity } from './entities/message-reaction.entity';
import { NotificationEntity } from './entities/notification.entity';
import { ThreadEntity } from './entities/thread.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChannelEntity,
      MessageEntity,
      ChannelMemberEntity,
      MessageReactionEntity,
      NotificationEntity,
      ThreadEntity,
    ]),
  ],
  controllers: [CommunicationController],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
