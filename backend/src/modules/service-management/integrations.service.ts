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
    if (!apiKey || !token || !listId) {
      this.logger.warn('Trello configuration incomplete');
      return null;
    }

    const labelColorMap: Record<TicketPriority, string> = {
      [TicketPriority.LOW]: 'green',
      [TicketPriority.MEDIUM]: 'yellow',
      [TicketPriority.HIGH]: 'orange',
      [TicketPriority.URGENT]: 'red',
      [TicketPriority.CRITICAL]: 'red',
    };

    try {
      // First, create the card
      const cardRes = await axios.post('https://api.trello.com/1/cards', null, {
        params: {
          key: apiKey,
          token,
          idList: listId,
          name: `[${ticket.ticket_number}] ${ticket.subject}`,
          desc: `**Customer:** ${ticket.customer_name || '—'}\n**Priority:** ${ticket.priority}\n**Status:** ${ticket.status}\n\n${ticket.description || ''}`,
          due: ticket.due_date?.toISOString() ?? null,
          pos: 'top',
        },
      });

      const cardId = cardRes.data.id;
      const cardUrl = cardRes.data.shortUrl;

      // Add priority label
      await axios.post(`https://api.trello.com/1/cards/${cardId}/labels`, null, {
        params: {
          key: apiKey,
          token,
          color: labelColorMap[ticket.priority] || 'blue',
          name: ticket.priority,
        },
      });

      this.logger.log(`Trello card created for ticket ${ticket.ticket_number}: ${cardUrl}`);
      return { id: cardId, url: cardUrl };
    } catch (err: any) {
      const errorMessage = err.response?.data || err.message;
      this.logger.warn(`Trello push failed: ${errorMessage}`);
      
      // Provide more specific error messages
      if (err.response?.status === 401) {
        throw new Error('Invalid Trello credentials. Please check your API key and token.');
      } else if (err.response?.status === 404) {
        throw new Error('List not found. Please check your List ID.');
      } else if (err.response?.status === 400) {
        throw new Error('Invalid request. Please check all required fields.');
      }
      
      throw new Error('Failed to create Trello card. Please try again.');
    }
  }

  async updateTrelloCard(
    apiKey: string,
    token: string,
    cardId: string,
    ticket: ServiceTicketEntity,
  ): Promise<void> {
    if (!apiKey || !token || !cardId) {
      this.logger.warn('Trello configuration incomplete for update');
      return;
    }
    
    try {
      await axios.put(`https://api.trello.com/1/cards/${cardId}`, null, {
        params: {
          key: apiKey,
          token,
          name: `[${ticket.ticket_number}] ${ticket.subject}`,
          desc: `**Customer:** ${ticket.customer_name || '—'}\n**Priority:** ${ticket.priority}\n**Status:** ${ticket.status}\n\n${ticket.description || ''}`,
        },
      });
      
      this.logger.log(`Trello card updated for ticket ${ticket.ticket_number}`);
    } catch (err: any) {
      const errorMessage = err.response?.data || err.message;
      this.logger.warn(`Trello update failed: ${errorMessage}`);
      
      if (err.response?.status === 401) {
        throw new Error('Invalid Trello credentials. Please check your API key and token.');
      } else if (err.response?.status === 404) {
        throw new Error('Card not found. The card may have been deleted.');
      }
    }
  }

  async testTrelloConnection(
    apiKey: string,
    token: string,
    listId: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!apiKey || !token || !listId) {
      return { success: false, message: 'Please provide API key, token, and list ID' };
    }

    try {
      // Test by fetching the list
      const listRes = await axios.get(`https://api.trello.com/1/lists/${listId}`, {
        params: { key: apiKey, token },
      });

      if (!listRes.data) {
        return { success: false, message: 'List not found' };
      }

      // Create a test card and then delete it
      const testCard = await axios.post('https://api.trello.com/1/cards', null, {
        params: {
          key: apiKey,
          token,
          idList: listId,
          name: 'ERP System Test Card',
          desc: 'This is a test card to verify the connection. It will be deleted automatically.',
        },
      });

      // Delete the test card
      await axios.delete(`https://api.trello.com/1/cards/${testCard.data.id}`, {
        params: { key: apiKey, token },
      });

      return { success: true, message: `Successfully connected to list: ${listRes.data.name}` };
    } catch (err: any) {
      const errorMessage = err.response?.data || err.message;
      
      if (err.response?.status === 401) {
        return { success: false, message: 'Invalid API key or token' };
      } else if (err.response?.status === 404) {
        return { success: false, message: 'List not found. Please check the List ID.' };
      } else if (err.response?.status === 400) {
        return { success: false, message: 'Invalid request format.' };
      }
      
      return { success: false, message: `Connection failed: ${errorMessage}` };
    }
  }

  async getTrelloLists(apiKey: string, token: string): Promise<Array<{id: string, name: string}>> {
    try {
      const boardId = 'm7reCEX4'; // Your board ID from the URL
      
      const response = await axios.get(`https://api.trello.com/1/boards/${boardId}/lists`, {
        params: { 
          key: apiKey, 
          token,
          cards: 'none' // Don't include card data, just lists
        },
      });

      // Filter out archived lists and return only id and name
      return response.data
        .filter((list: any) => !list.closed)
        .map((list: any) => ({
          id: list.id,
          name: list.name,
        }));
    } catch (err: any) {
      this.logger.error('Failed to fetch Trello lists:', err);
      throw new Error('Failed to fetch Trello lists');
    }
  }
}
