import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import type { JwtUser } from '../../types/express';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  getMessages(
    @CurrentTenant() tenantId: string,
    @Query('since') since?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(tenantId, since, limit ? parseInt(limit) : 80);
  }

  @Post('messages')
  sendMessage(
    @Body('content') content: string,
    @Body('reply_to_id') replyToId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.sendMessage(tenantId, user.sub, user.name ?? user.email, content, replyToId);
  }

  @Patch('messages/:id')
  editMessage(
    @Param('id') id: string,
    @Body('content') content: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.editMessage(id, tenantId, user.sub, content);
  }

  @Delete('messages/:id')
  deleteMessage(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.deleteMessage(id, tenantId, user.sub);
  }

  @Post('messages/:id/react')
  toggleReaction(
    @Param('id') id: string,
    @Body('emoji') emoji: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.toggleReaction(id, tenantId, user.sub, emoji);
  }

  @Post('read')
  markRead(@CurrentTenant() tenantId: string, @CurrentUser() user: JwtUser) {
    return this.chatService.markRead(tenantId, user.sub);
  }

  @Get('unread')
  getUnread(@CurrentTenant() tenantId: string, @CurrentUser() user: JwtUser) {
    return this.chatService.getUnreadCount(tenantId, user.sub);
  }

  @Post('heartbeat')
  heartbeat(
    @Body('is_typing') isTyping: boolean,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.heartbeat(tenantId, user.sub, user.name ?? user.email, isTyping ?? false);
  }

  @Get('presence')
  getPresence(@CurrentTenant() tenantId: string) {
    return this.chatService.getPresence(tenantId);
  }
}
