import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChannelEntity, ChannelStatus, ChannelType } from './entities/channel.entity';
import { MessageEntity, MessageStatus } from './entities/message.entity';
import { ChannelMemberEntity, MemberRole, MemberStatus } from './entities/channel-member.entity';
import { MessageReactionEntity } from './entities/message-reaction.entity';
import { NotificationEntity, NotificationStatus } from './entities/notification.entity';
import { ThreadEntity } from './entities/thread.entity';
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

@Injectable()
export class CommunicationService {
  constructor(
    @InjectRepository(ChannelEntity)
    private channelRepo: Repository<ChannelEntity>,
    @InjectRepository(MessageEntity)
    private messageRepo: Repository<MessageEntity>,
    @InjectRepository(ChannelMemberEntity)
    private memberRepo: Repository<ChannelMemberEntity>,
    @InjectRepository(MessageReactionEntity)
    private reactionRepo: Repository<MessageReactionEntity>,
    @InjectRepository(NotificationEntity)
    private notificationRepo: Repository<NotificationEntity>,
    @InjectRepository(ThreadEntity)
    private threadRepo: Repository<ThreadEntity>,
  ) {}

  // ==================== CHANNEL METHODS ====================

  async createChannel(
    data: CreateChannelDto,
    userId: string,
    tenantId: string,
  ): Promise<ChannelEntity> {
    const channel = this.channelRepo.create({
      ...data,
      created_by: userId,
      tenant_id: tenantId,
    });

    const savedChannel = await this.channelRepo.save(channel);

    // Add creator as owner
    await this.addMember(
      savedChannel.id,
      { user_ids: [userId], role: MemberRole.OWNER },
      userId,
      tenantId,
    );

    // Add additional members if provided
    if (data.member_ids && data.member_ids.length > 0) {
      await this.addMember(
        savedChannel.id,
        { user_ids: data.member_ids },
        userId,
        tenantId,
      );
    }

    return this.getChannel(savedChannel.id, userId, tenantId);
  }

  async getChannels(
    userId: string,
    tenantId: string,
  ): Promise<ChannelEntity[]> {
    // Get channels where user is a member
    const memberships = await this.memberRepo.find({
      where: {
        user_id: userId,
        tenant_id: tenantId,
        status: MemberStatus.ACTIVE,
      },
    });

    const channelIds = memberships.map((m) => m.channel_id);

    if (channelIds.length === 0) {
      return [];
    }

    return this.channelRepo.find({
      where: {
        id: In(channelIds),
        tenant_id: tenantId,
        status: ChannelStatus.ACTIVE,
      },
      relations: ['creator'],
      order: { last_message_at: 'DESC' },
    });
  }

  async getChannel(
    id: string,
    userId: string,
    tenantId: string,
  ): Promise<ChannelEntity> {
    const channel = await this.channelRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['creator'],
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Check if user is a member
    const membership = await this.memberRepo.findOne({
      where: {
        channel_id: id,
        user_id: userId,
        tenant_id: tenantId,
      },
    });

    if (!membership && channel.channel_type !== ChannelType.PUBLIC) {
      throw new ForbiddenException('You are not a member of this channel');
    }

    return channel;
  }

  async updateChannel(
    id: string,
    data: UpdateChannelDto,
    userId: string,
    tenantId: string,
  ): Promise<ChannelEntity> {
    const channel = await this.getChannel(id, userId, tenantId);

    // Check if user has permission to update
    await this.checkChannelPermission(id, userId, tenantId, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);

    Object.assign(channel, data);
    return this.channelRepo.save(channel);
  }

  async deleteChannel(
    id: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const channel = await this.getChannel(id, userId, tenantId);

    // Only owner can delete
    await this.checkChannelPermission(id, userId, tenantId, [MemberRole.OWNER]);

    channel.status = ChannelStatus.DELETED;
    await this.channelRepo.save(channel);
  }

  async archiveChannel(
    id: string,
    userId: string,
    tenantId: string,
  ): Promise<ChannelEntity> {
    const channel = await this.getChannel(id, userId, tenantId);

    await this.checkChannelPermission(id, userId, tenantId, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);

    channel.status = ChannelStatus.ARCHIVED;
    return this.channelRepo.save(channel);
  }

  // ==================== CHANNEL MEMBER METHODS ====================

  async addMember(
    channelId: string,
    data: AddChannelMemberDto,
    userId: string,
    tenantId: string,
  ): Promise<ChannelMemberEntity[]> {
    const channel = await this.getChannel(channelId, userId, tenantId);

    // Check permission
    await this.checkChannelPermission(channelId, userId, tenantId, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);

    const members: ChannelMemberEntity[] = [];

    for (const memberId of data.user_ids) {
      // Check if already a member
      const existing = await this.memberRepo.findOne({
        where: {
          channel_id: channelId,
          user_id: memberId,
          tenant_id: tenantId,
        },
      });

      if (!existing) {
        const member = this.memberRepo.create({
          channel_id: channelId,
          user_id: memberId,
          role: (data.role as MemberRole) || MemberRole.MEMBER,
          added_by: userId,
          tenant_id: tenantId,
        });

        members.push(await this.memberRepo.save(member));
      }
    }

    // Update member count
    channel.member_count = await this.memberRepo.count({
      where: { channel_id: channelId, tenant_id: tenantId },
    });
    await this.channelRepo.save(channel);

    return members;
  }

  async removeMember(
    channelId: string,
    memberId: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    await this.checkChannelPermission(channelId, userId, tenantId, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);

    const member = await this.memberRepo.findOne({
      where: {
        channel_id: channelId,
        user_id: memberId,
        tenant_id: tenantId,
      },
    });

    if (member) {
      await this.memberRepo.remove(member);

      // Update member count
      const channel = await this.channelRepo.findOne({
        where: { id: channelId, tenant_id: tenantId },
      });
      if (channel) {
        channel.member_count = await this.memberRepo.count({
          where: { channel_id: channelId, tenant_id: tenantId },
        });
        await this.channelRepo.save(channel);
      }
    }
  }

  async getChannelMembers(
    channelId: string,
    userId: string,
    tenantId: string,
  ): Promise<ChannelMemberEntity[]> {
    await this.getChannel(channelId, userId, tenantId);

    return this.memberRepo.find({
      where: {
        channel_id: channelId,
        tenant_id: tenantId,
        status: MemberStatus.ACTIVE,
      },
      relations: ['user'],
      order: { joined_at: 'ASC' },
    });
  }

  private async checkChannelPermission(
    channelId: string,
    userId: string,
    tenantId: string,
    allowedRoles: MemberRole[],
  ): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: {
        channel_id: channelId,
        user_id: userId,
        tenant_id: tenantId,
      },
    });

    if (!member || !allowedRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  // ==================== MESSAGE METHODS ====================

  async createMessage(
    data: CreateMessageDto,
    userId: string,
    tenantId: string,
  ): Promise<MessageEntity> {
    // Verify user is a member
    await this.getChannel(data.channel_id, userId, tenantId);

    const message = this.messageRepo.create({
      ...data,
      sender_id: userId,
      tenant_id: tenantId,
    });

    const savedMessage = await this.messageRepo.save(message);

    // Update channel last message
    const channel = await this.channelRepo.findOne({
      where: { id: data.channel_id, tenant_id: tenantId },
    });
    if (channel) {
      channel.last_message_at = new Date();
      channel.message_count = channel.message_count + 1;
      await this.channelRepo.save(channel);
    }

    // Update thread if reply
    if (data.parent_message_id) {
      await this.updateThread(data.parent_message_id, userId, tenantId);
    }

    // Create notifications for mentions
    if (data.mentions && data.mentions.length > 0) {
      await this.createMentionNotifications(
        savedMessage,
        data.mentions,
        tenantId,
      );
    }

    return this.getMessage(savedMessage.id, userId, tenantId);
  }

  async getMessages(
    channelId: string,
    userId: string,
    tenantId: string,
    limit = 50,
    before?: string,
  ): Promise<MessageEntity[]> {
    await this.getChannel(channelId, userId, tenantId);

    const where: any = {
      channel_id: channelId,
      tenant_id: tenantId,
      status: In([MessageStatus.SENT, MessageStatus.EDITED]),
    };

    const query = this.messageRepo
      .createQueryBuilder('message')
      .where(where)
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.reactions', 'reactions')
      .orderBy('message.created_at', 'DESC')
      .take(limit);

    if (before) {
      query.andWhere('message.created_at < :before', {
        before: new Date(before),
      });
    }

    return query.getMany();
  }

  async getMessage(
    id: string,
    userId: string,
    tenantId: string,
  ): Promise<MessageEntity> {
    const message = await this.messageRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['sender', 'reactions', 'reactions.user'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user has access to channel
    await this.getChannel(message.channel_id, userId, tenantId);

    return message;
  }

  async updateMessage(
    id: string,
    data: UpdateMessageDto,
    userId: string,
    tenantId: string,
  ): Promise<MessageEntity> {
    const message = await this.getMessage(id, userId, tenantId);

    if (message.sender_id !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    message.content = data.content;
    if (data.attachments) {
      message.attachments = data.attachments;
    }
    message.is_edited = true;
    message.edited_at = new Date();
    message.status = MessageStatus.EDITED;

    return this.messageRepo.save(message);
  }

  async deleteMessage(
    id: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const message = await this.getMessage(id, userId, tenantId);

    if (message.sender_id !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    message.status = MessageStatus.DELETED;
    await this.messageRepo.save(message);
  }

  async pinMessage(
    id: string,
    userId: string,
    tenantId: string,
  ): Promise<MessageEntity> {
    const message = await this.getMessage(id, userId, tenantId);

    await this.checkChannelPermission(message.channel_id, userId, tenantId, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);

    message.is_pinned = true;
    return this.messageRepo.save(message);
  }

  async unpinMessage(
    id: string,
    userId: string,
    tenantId: string,
  ): Promise<MessageEntity> {
    const message = await this.getMessage(id, userId, tenantId);

    await this.checkChannelPermission(message.channel_id, userId, tenantId, [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ]);

    message.is_pinned = false;
    return this.messageRepo.save(message);
  }

  // ==================== REACTION METHODS ====================

  async addReaction(
    messageId: string,
    data: AddReactionDto,
    userId: string,
    tenantId: string,
  ): Promise<MessageReactionEntity> {
    const message = await this.getMessage(messageId, userId, tenantId);

    // Check if reaction already exists
    const existing = await this.reactionRepo.findOne({
      where: {
        message_id: messageId,
        user_id: userId,
        emoji: data.emoji,
        tenant_id: tenantId,
      },
    });

    if (existing) {
      return existing;
    }

    const reaction = this.reactionRepo.create({
      message_id: messageId,
      user_id: userId,
      emoji: data.emoji,
      tenant_id: tenantId,
    });

    return this.reactionRepo.save(reaction);
  }

  async removeReaction(
    messageId: string,
    emoji: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const reaction = await this.reactionRepo.findOne({
      where: {
        message_id: messageId,
        user_id: userId,
        emoji,
        tenant_id: tenantId,
      },
    });

    if (reaction) {
      await this.reactionRepo.remove(reaction);
    }
  }

  // ==================== THREAD METHODS ====================

  private async updateThread(
    parentMessageId: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const parentMessage = await this.messageRepo.findOne({
      where: { id: parentMessageId, tenant_id: tenantId },
    });

    if (!parentMessage) return;

    let thread = await this.threadRepo.findOne({
      where: {
        parent_message_id: parentMessageId,
        tenant_id: tenantId,
      },
    });

    if (!thread) {
      thread = this.threadRepo.create({
        channel_id: parentMessage.channel_id,
        parent_message_id: parentMessageId,
        participants: [userId],
        tenant_id: tenantId,
      });
    } else {
      if (!thread.participants.includes(userId)) {
        thread.participants.push(userId);
      }
    }

    thread.reply_count = thread.reply_count + 1;
    thread.participant_count = thread.participants.length;
    thread.last_reply_at = new Date();

    await this.threadRepo.save(thread);

    // Update parent message reply count
    parentMessage.reply_count = thread.reply_count;
    await this.messageRepo.save(parentMessage);
  }

  async getThread(
    parentMessageId: string,
    userId: string,
    tenantId: string,
  ): Promise<{ thread: ThreadEntity; messages: MessageEntity[] }> {
    const thread = await this.threadRepo.findOne({
      where: {
        parent_message_id: parentMessageId,
        tenant_id: tenantId,
      },
      relations: ['parent_message', 'channel'],
    });

    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    // Verify access
    await this.getChannel(thread.channel_id, userId, tenantId);

    const messages = await this.messageRepo.find({
      where: {
        parent_message_id: parentMessageId,
        tenant_id: tenantId,
      },
      relations: ['sender', 'reactions'],
      order: { created_at: 'ASC' },
    });

    return { thread, messages };
  }

  // ==================== NOTIFICATION METHODS ====================

  async createNotification(
    data: CreateNotificationDto,
    tenantId: string,
  ): Promise<NotificationEntity> {
    const notification = this.notificationRepo.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.notificationRepo.save(notification);
  }

  private async createMentionNotifications(
    message: MessageEntity,
    mentions: string[],
    tenantId: string,
  ): Promise<void> {
    for (const userId of mentions) {
      await this.createNotification(
        {
          user_id: userId,
          notification_type: 'mention' as any,
          title: 'You were mentioned',
          message: `${message.sender_id} mentioned you in a message`,
          related_entity_type: 'message',
          related_entity_id: message.id,
          data: {
            channel_id: message.channel_id,
            message_id: message.id,
          },
        },
        tenantId,
      );
    }
  }

  async getNotifications(
    userId: string,
    tenantId: string,
  ): Promise<NotificationEntity[]> {
    return this.notificationRepo.find({
      where: {
        user_id: userId,
        tenant_id: tenantId,
      },
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  async markNotificationAsRead(
    id: string,
    userId: string,
    tenantId: string,
  ): Promise<NotificationEntity> {
    const notification = await this.notificationRepo.findOne({
      where: { id, user_id: userId, tenant_id: tenantId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.status = NotificationStatus.READ;
    notification.read_at = new Date();

    return this.notificationRepo.save(notification);
  }

  async markAllNotificationsAsRead(
    userId: string,
    tenantId: string,
  ): Promise<void> {
    await this.notificationRepo.update(
      {
        user_id: userId,
        tenant_id: tenantId,
        status: NotificationStatus.UNREAD,
      },
      {
        status: NotificationStatus.READ,
        read_at: new Date(),
      },
    );
  }

  // ==================== UNREAD COUNT METHODS ====================

  async markChannelAsRead(
    channelId: string,
    data: MarkAsReadDto,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const member = await this.memberRepo.findOne({
      where: {
        channel_id: channelId,
        user_id: userId,
        tenant_id: tenantId,
      },
    });

    if (member) {
      member.last_read_at = new Date();
      member.unread_count = 0;
      await this.memberRepo.save(member);
    }
  }

  async getUnreadCount(
    userId: string,
    tenantId: string,
  ): Promise<{ total: number; by_channel: Record<string, number> }> {
    const memberships = await this.memberRepo.find({
      where: {
        user_id: userId,
        tenant_id: tenantId,
        status: MemberStatus.ACTIVE,
      },
    });

    const byChannel: Record<string, number> = {};
    let total = 0;

    for (const member of memberships) {
      byChannel[member.channel_id] = member.unread_count;
      total += member.unread_count;
    }

    return { total, by_channel: byChannel };
  }
}
