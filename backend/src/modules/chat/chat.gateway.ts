import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';

interface AuthSocket extends Socket {
  tenantId: string;
  userId: string;
  userName: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ── Auth handshake ────────────────────────────────────────────────────────
  async handleConnection(client: AuthSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) { client.disconnect(); return; }

      const secret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
      const payload = this.jwtService.verify(token, { secret });

      client.tenantId = payload.tenantId;
      client.userId = payload.sub;
      client.userName = payload.name ?? payload.email;

      // Join tenant room so messages are isolated
      client.join(`tenant:${client.tenantId}`);

      // Send last 80 messages on connect
      const messages = await this.chatService.getMessages(client.tenantId);
      client.emit('history', messages);

      // Send unread count
      const unread = await this.chatService.getUnreadCount(client.tenantId, client.userId);
      client.emit('unread', unread);

      // Broadcast updated presence
      await this.chatService.heartbeat(client.tenantId, client.userId, client.userName, false);
      this.broadcastPresence(client.tenantId);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthSocket) {
    if (client.tenantId) this.broadcastPresence(client.tenantId);
  }

  // ── Send message ──────────────────────────────────────────────────────────
  @SubscribeMessage('send_message')
  async onSendMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { content: string; reply_to_id?: string },
  ) {
    const msg = await this.chatService.sendMessage(
      client.tenantId, client.userId, client.userName,
      data.content, data.reply_to_id,
    );
    // Broadcast to everyone in the tenant room
    this.server.to(`tenant:${client.tenantId}`).emit('new_message', msg);
  }

  // ── Edit message ──────────────────────────────────────────────────────────
  @SubscribeMessage('edit_message')
  async onEditMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { id: string; content: string },
  ) {
    const msg = await this.chatService.editMessage(data.id, client.tenantId, client.userId, data.content);
    this.server.to(`tenant:${client.tenantId}`).emit('message_updated', msg);
  }

  // ── Delete message ────────────────────────────────────────────────────────
  @SubscribeMessage('delete_message')
  async onDeleteMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { id: string },
  ) {
    const msg = await this.chatService.deleteMessage(data.id, client.tenantId, client.userId);
    this.server.to(`tenant:${client.tenantId}`).emit('message_updated', msg);
  }

  // ── React ─────────────────────────────────────────────────────────────────
  @SubscribeMessage('react')
  async onReact(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { id: string; emoji: string },
  ) {
    const msg = await this.chatService.toggleReaction(data.id, client.tenantId, client.userId, data.emoji);
    this.server.to(`tenant:${client.tenantId}`).emit('message_updated', msg);
  }

  // ── Typing ────────────────────────────────────────────────────────────────
  @SubscribeMessage('typing')
  async onTyping(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { is_typing: boolean },
  ) {
    await this.chatService.heartbeat(client.tenantId, client.userId, client.userName, data.is_typing);
    this.broadcastPresence(client.tenantId);
  }

  // ── Mark read ─────────────────────────────────────────────────────────────
  @SubscribeMessage('mark_read')
  async onMarkRead(@ConnectedSocket() client: AuthSocket) {
    await this.chatService.markRead(client.tenantId, client.userId);
    client.emit('unread', 0);
  }

  // ── Heartbeat ─────────────────────────────────────────────────────────────
  @SubscribeMessage('heartbeat')
  async onHeartbeat(@ConnectedSocket() client: AuthSocket) {
    await this.chatService.heartbeat(client.tenantId, client.userId, client.userName, false);
    this.broadcastPresence(client.tenantId);
  }

  private async broadcastPresence(tenantId: string) {
    const presence = await this.chatService.getPresence(tenantId);
    this.server.to(`tenant:${tenantId}`).emit('presence', presence);
  }
}
