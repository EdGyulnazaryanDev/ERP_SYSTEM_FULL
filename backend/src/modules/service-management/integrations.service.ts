import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ServiceTicketEntity, TicketPriority } from './entities/service-ticket.entity';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(private readonly config: ConfigService) {}

  // ── Slack ─────────────────────────────────────────────────────────────────

  async sendSlackNotification(
    webhookUrl: string,
    ticket: ServiceTicketEntity,
    event: 'created' | 'updated' | 'resolved' | 'assigned',
  ): Promise<void> {
    if (!webhookUrl) return;

    const colorMap: Record<string, string> = {
      created: '#0ea5e9',
      updated: '#f59e0b',
      resolved: '#22c55e',
      assigned: '#8b5cf6',
    };

    const priorityEmoji: Record<TicketPriority, string> = {
      [TicketPriority.LOW]: '🟢',
      [TicketPriority.MEDIUM]: '🟡',
      [TicketPriority.HIGH]: '🟠',
      [TicketPriority.URGENT]: '🔴',
      [TicketPriority.CRITICAL]: '🚨',
    };

    const payload = {
      attachments: [{
        color: colorMap[event],
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Ticket ${event.charAt(0).toUpperCase() + event.slice(1)}* — \`${ticket.ticket_number}\``,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Subject:*\n${ticket.subject}` },
              { type: 'mrkdwn', text: `*Priority:*\n${priorityEmoji[ticket.priority]} ${ticket.priority}` },
              { type: 'mrkdwn', text: `*Status:*\n${ticket.status}` },
              { type: 'mrkdwn', text: `*Customer:*\n${ticket.customer_name || '—'}` },
            ],
          },
        ],
      }],
    };

    try {
      await axios.post(webhookUrl, payload);
      this.logger.log(`Slack notification sent for ticket ${ticket.ticket_number}`);
    } catch (err) {
      this.logger.warn(`Slack notification failed: ${err.message}`);
    }
  }

  // ── Trello ────────────────────────────────────────────────────────────────

  async pushToTrello(
    apiKey: string,
    token: string,
    listId: string,
    ticket: ServiceTicketEntity,
  ): Promise<{ id: string; url: string } | null> {
    if (!apiKey || !token || !listId) return null;

    const labelColorMap: Record<TicketPriority, string> = {
      [TicketPriority.LOW]: 'green',
      [TicketPriority.MEDIUM]: 'yellow',
      [TicketPriority.HIGH]: 'orange',
      [TicketPriority.URGENT]: 'red',
      [TicketPriority.CRITICAL]: 'red',
    };

    try {
      const res = await axios.post('https://api.trello.com/1/cards', null, {
        params: {
          key: apiKey,
          token,
          idList: listId,
          name: `[${ticket.ticket_number}] ${ticket.subject}`,
          desc: `**Customer:** ${ticket.customer_name || '—'}\n**Priority:** ${ticket.priority}\n**Status:** ${ticket.status}\n\n${ticket.description}`,
          due: ticket.due_date?.toISOString() ?? null,
          pos: 'top',
        },
      });

      this.logger.log(`Trello card created for ticket ${ticket.ticket_number}: ${res.data.shortUrl}`);
      return { id: res.data.id, url: res.data.shortUrl };
    } catch (err) {
      this.logger.warn(`Trello push failed: ${err.message}`);
      return null;
    }
  }

  async updateTrelloCard(
    apiKey: string,
    token: string,
    cardId: string,
    ticket: ServiceTicketEntity,
  ): Promise<void> {
    if (!apiKey || !token || !cardId) return;
    try {
      await axios.put(`https://api.trello.com/1/cards/${cardId}`, null, {
        params: {
          key: apiKey,
          token,
          name: `[${ticket.ticket_number}] ${ticket.subject}`,
          desc: `**Customer:** ${ticket.customer_name || '—'}\n**Priority:** ${ticket.priority}\n**Status:** ${ticket.status}\n\n${ticket.description}`,
        },
      });
    } catch (err) {
      this.logger.warn(`Trello update failed: ${err.message}`);
    }
  }
}
