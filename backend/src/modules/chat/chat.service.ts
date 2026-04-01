import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { ChatMessage, ChatPresence, ChatReadReceipt } from './chat.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly msgRepo: Repository<ChatMessage>,
    @InjectRepository(ChatReadReceipt)
    private readonly receiptRepo: Repository<ChatReadReceipt>,
    @InjectRepository(ChatPresence)
    private readonly presenceRepo: Repository<ChatPresence>,
  ) {}

  // ── Messages ──────────────────────────────────────────────────────────────

  async getMessages(tenantId: string, since?: string, limit = 80) {
    const where: any = { tenant_id: tenantId, is_deleted: false };
    if (since) where.created_at = MoreThan(new Date(since));
    return this.msgRepo.find({
      where,
      order: { created_at: 'ASC' },
      take: limit,
    });
  }

  async sendMessage(
    tenantId: string,
    userId: string,
    userName: string,
    content: string,
    replyToId?: string,
  ) {
    if (!content?.trim())
      throw new BadRequestException('Message cannot be empty');

    let replyPreview: string | undefined;
    if (replyToId) {
      const parent = await this.msgRepo.findOne({
        where: { id: replyToId, tenant_id: tenantId },
      });
      if (parent) replyPreview = parent.content.slice(0, 80);
    }

    const msg = this.msgRepo.create({
      tenant_id: tenantId,
      user_id: userId,
      user_name: userName,
      content: content.trim(),
      reply_to_id: replyToId,
      reply_to_preview: replyPreview,
      reactions: {},
    });
    return this.msgRepo.save(msg);
  }

  async editMessage(
    id: string,
    tenantId: string,
    userId: string,
    content: string,
  ) {
    const msg = await this.msgRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.user_id !== userId)
      throw new ForbiddenException('Cannot edit others messages');
    msg.content = content.trim();
    msg.is_edited = true;
    return this.msgRepo.save(msg);
  }

  async deleteMessage(id: string, tenantId: string, userId: string) {
    const msg = await this.msgRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.user_id !== userId)
      throw new ForbiddenException('Cannot delete others messages');
    msg.is_deleted = true;
    msg.content = 'This message was deleted';
    return this.msgRepo.save(msg);
  }

  async toggleReaction(
    id: string,
    tenantId: string,
    userId: string,
    emoji: string,
  ) {
    const msg = await this.msgRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!msg) throw new NotFoundException('Message not found');

    const reactions = { ...msg.reactions };
    if (!reactions[emoji]) reactions[emoji] = [];

    const idx = reactions[emoji].indexOf(userId);
    if (idx >= 0) reactions[emoji].splice(idx, 1);
    else reactions[emoji].push(userId);

    if (reactions[emoji].length === 0) delete reactions[emoji];
    msg.reactions = reactions;
    return this.msgRepo.save(msg);
  }

  // ── Read receipts ─────────────────────────────────────────────────────────

  async markRead(tenantId: string, userId: string) {
    let receipt = await this.receiptRepo.findOne({
      where: { tenant_id: tenantId, user_id: userId },
    });
    if (!receipt) {
      receipt = this.receiptRepo.create({
        tenant_id: tenantId,
        user_id: userId,
        last_read_at: new Date(),
      });
    } else {
      receipt.last_read_at = new Date();
    }
    return this.receiptRepo.save(receipt);
  }

  async getUnreadCount(tenantId: string, userId: string): Promise<number> {
    const receipt = await this.receiptRepo.findOne({
      where: { tenant_id: tenantId, user_id: userId },
    });
    if (!receipt) {
      return this.msgRepo.count({
        where: { tenant_id: tenantId, is_deleted: false },
      });
    }
    return this.msgRepo.count({
      where: {
        tenant_id: tenantId,
        is_deleted: false,
        created_at: MoreThan(receipt.last_read_at),
      },
    });
  }

  // ── Presence & typing ─────────────────────────────────────────────────────

  async heartbeat(
    tenantId: string,
    userId: string,
    userName: string,
    isTyping = false,
  ) {
    let p = await this.presenceRepo.findOne({
      where: { tenant_id: tenantId, user_id: userId },
    });
    if (!p) {
      p = this.presenceRepo.create({
        tenant_id: tenantId,
        user_id: userId,
        user_name: userName,
      });
    }
    p.last_seen_at = new Date();
    p.user_name = userName;
    p.is_typing = isTyping;
    p.typing_at = isTyping ? new Date() : p.typing_at;
    return this.presenceRepo.save(p);
  }

  async getPresence(tenantId: string) {
    const cutoff = new Date(Date.now() - 30_000); // online = seen in last 30s
    const rows = await this.presenceRepo.find({
      where: { tenant_id: tenantId },
    });
    const typingCutoff = new Date(Date.now() - 5_000);
    return rows
      .filter((p) => p.last_seen_at > cutoff)
      .map((p) => ({
        user_id: p.user_id,
        user_name: p.user_name,
        is_typing: p.is_typing && p.typing_at > typingCutoff,
      }));
  }
}
