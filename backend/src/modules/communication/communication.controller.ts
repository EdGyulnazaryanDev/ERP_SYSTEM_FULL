import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CommunicationService } from './communication.service';
import type {
  CreateChannelDto,
  UpdateChannelDto,
  AddChannelMemberDto,
} from './dto/create-channel.dto';
import type {
  CreateMessageDto,
  UpdateMessageDto,
  AddReactionDto,
  MarkAsReadDto,
} from './dto/create-message.dto';
import type { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('communication')
@UseGuards(JwtAuthGuard)
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  // ==================== CHANNEL ENDPOINTS ====================

  @Post('channels')
  createChannel(
    @Body() data: CreateChannelDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.createChannel(
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Get('channels')
  getChannels(@Request() req: any, @CurrentTenant() tenantId: string) {
    return this.communicationService.getChannels(req.user.userId, tenantId);
  }

  @Get('channels/:id')
  getChannel(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.getChannel(id, req.user.userId, tenantId);
  }

  @Put('channels/:id')
  updateChannel(
    @Param('id') id: string,
    @Body() data: UpdateChannelDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.updateChannel(
      id,
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Delete('channels/:id')
  deleteChannel(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.deleteChannel(
      id,
      req.user.userId,
      tenantId,
    );
  }

  @Post('channels/:id/archive')
  archiveChannel(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.archiveChannel(
      id,
      req.user.userId,
      tenantId,
    );
  }

  // ==================== CHANNEL MEMBER ENDPOINTS ====================

  @Post('channels/:id/members')
  addMember(
    @Param('id') id: string,
    @Body() data: AddChannelMemberDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.addMember(
      id,
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Delete('channels/:id/members/:memberId')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.removeMember(
      id,
      memberId,
      req.user.userId,
      tenantId,
    );
  }

  @Get('channels/:id/members')
  getChannelMembers(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.getChannelMembers(
      id,
      req.user.userId,
      tenantId,
    );
  }

  // ==================== MESSAGE ENDPOINTS ====================

  @Post('messages')
  createMessage(
    @Body() data: CreateMessageDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.createMessage(
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Get('channels/:channelId/messages')
  getMessages(
    @Param('channelId') channelId: string,
    @Query('limit') limit: string,
    @Query('before') before: string,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.getMessages(
      channelId,
      req.user.userId,
      tenantId,
      limit ? parseInt(limit) : 50,
      before,
    );
  }

  @Get('messages/:id')
  getMessage(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.getMessage(
      id,
      req.user.userId,
      tenantId,
    );
  }

  @Put('messages/:id')
  updateMessage(
    @Param('id') id: string,
    @Body() data: UpdateMessageDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.updateMessage(
      id,
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Delete('messages/:id')
  deleteMessage(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.deleteMessage(
      id,
      req.user.userId,
      tenantId,
    );
  }

  @Post('messages/:id/pin')
  pinMessage(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.pinMessage(
      id,
      req.user.userId,
      tenantId,
    );
  }

  @Post('messages/:id/unpin')
  unpinMessage(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.unpinMessage(
      id,
      req.user.userId,
      tenantId,
    );
  }

  // ==================== REACTION ENDPOINTS ====================

  @Post('messages/:id/reactions')
  addReaction(
    @Param('id') id: string,
    @Body() data: AddReactionDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.addReaction(
      id,
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Delete('messages/:id/reactions/:emoji')
  removeReaction(
    @Param('id') id: string,
    @Param('emoji') emoji: string,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.removeReaction(
      id,
      emoji,
      req.user.userId,
      tenantId,
    );
  }

  // ==================== THREAD ENDPOINTS ====================

  @Get('messages/:id/thread')
  getThread(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.getThread(id, req.user.userId, tenantId);
  }

  // ==================== NOTIFICATION ENDPOINTS ====================

  @Post('notifications')
  createNotification(
    @Body() data: CreateNotificationDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.createNotification(data, tenantId);
  }

  @Get('notifications')
  getNotifications(@Request() req: any, @CurrentTenant() tenantId: string) {
    return this.communicationService.getNotifications(
      req.user.userId,
      tenantId,
    );
  }

  @Post('notifications/:id/read')
  markNotificationAsRead(
    @Param('id') id: string,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.markNotificationAsRead(
      id,
      req.user.userId,
      tenantId,
    );
  }

  @Post('notifications/read-all')
  markAllNotificationsAsRead(
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.markAllNotificationsAsRead(
      req.user.userId,
      tenantId,
    );
  }

  // ==================== UNREAD COUNT ENDPOINTS ====================

  @Post('channels/:id/read')
  markChannelAsRead(
    @Param('id') id: string,
    @Body() data: MarkAsReadDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.communicationService.markChannelAsRead(
      id,
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: any, @CurrentTenant() tenantId: string) {
    return this.communicationService.getUnreadCount(
      req.user.userId,
      tenantId,
    );
  }
}
