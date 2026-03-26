import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatMessage, ChatPresence, ChatReadReceipt } from './chat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage, ChatReadReceipt, ChatPresence]),
    JwtModule.register({}),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
