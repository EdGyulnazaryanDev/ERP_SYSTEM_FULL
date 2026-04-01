import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ServiceManagementService } from './service-management.service';
import { IntegrationsService } from './integrations.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketIntegrationEntity } from './entities/ticket-integration.entity';
import { CreateTicketDto, UpdateTicketDto, RateTicketDto } from './dto/create-ticket.dto';
import { CreateFieldServiceOrderDto, UpdateFieldServiceOrderDto } from './dto/create-field-service-order.dto';
import { TicketStatus } from './entities/service-ticket.entity';
import { ServiceOrderStatus } from './entities/field-service-order.entity';

@Controller('service-management')
@UseGuards(JwtAuthGuard)
export class ServiceManagementController {
  constructor(
    private readonly serviceManagementService: ServiceManagementService,
    private readonly integrationsService: IntegrationsService,
    @InjectRepository(TicketIntegrationEntity)
    private readonly integrationRepo: Repository<TicketIntegrationEntity>,
  ) { }

  // Tickets
  @Get('tickets')
  @RequirePermission('ticket', 'read')
  async findAllTickets(@CurrentTenant() tenantId: string, @Query('status') status?: TicketStatus) {
    return this.serviceManagementService.findAllTickets(tenantId, status);
  }

  @Get('tickets/:id')
  @RequirePermission('ticket', 'read')
  async findOneTicket(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.findOneTicket(id, tenantId);
  }

  @Post('tickets')
  @RequirePermission('ticket', 'create')
  async createTicket(@Body() data: CreateTicketDto, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.createTicket(data, tenantId);
  }

  @Put('tickets/:id')
  @RequirePermission('ticket', 'update')
  async updateTicket(@Param('id') id: string, @Body() data: UpdateTicketDto, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.updateTicket(id, data, tenantId);
  }

  @Delete('tickets/:id')
  @RequirePermission('ticket', 'delete')
  async deleteTicket(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.serviceManagementService.deleteTicket(id, tenantId);
    return { message: 'Ticket deleted successfully' };
  }

  @Post('tickets/:id/assign')
  @RequirePermission('ticket', 'update')
  async assignTicket(@Param('id') id: string, @Body('assignedTo') assignedTo: string, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.assignTicket(id, assignedTo, tenantId);
  }

  @Post('tickets/:id/respond')
  @RequirePermission('ticket', 'update')
  async respondToTicket(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.respondToTicket(id, tenantId);
  }

  @Post('tickets/:id/resolve')
  @RequirePermission('ticket', 'update')
  async resolveTicket(@Param('id') id: string, @Body('resolutionNotes') resolutionNotes: string, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.resolveTicket(id, resolutionNotes, tenantId);
  }

  @Post('tickets/:id/close')
  @RequirePermission('ticket', 'update')
  async closeTicket(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.closeTicket(id, tenantId);
  }

  @Post('tickets/:id/rate')
  @RequirePermission('ticket', 'read')
  async rateTicket(@Param('id') id: string, @Body() data: RateTicketDto, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.rateTicket(id, data, tenantId);
  }

  @Get('tickets/assignee/:assigneeId')
  @RequirePermission('ticket', 'read')
  async getTicketsByAssignee(@Param('assigneeId') assigneeId: string, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.getTicketsByAssignee(assigneeId, tenantId);
  }

  // SLA Violations
  @Get('sla-violations')
  @RequirePermission('ticket', 'read')
  async getSLAViolations(@CurrentTenant() tenantId: string) {
    return this.serviceManagementService.getSLAViolations(tenantId);
  }

  // Field Service Orders
  @Get('field-service-orders')
  @RequirePermission('field_service', 'read')
  async findAllFieldServiceOrders(@CurrentTenant() tenantId: string, @Query('status') status?: ServiceOrderStatus) {
    return this.serviceManagementService.findAllFieldServiceOrders(tenantId, status);
  }

  @Get('field-service-orders/:id')
  @RequirePermission('field_service', 'read')
  async findOneFieldServiceOrder(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.findOneFieldServiceOrder(id, tenantId);
  }

  @Post('field-service-orders')
  @RequirePermission('field_service', 'create')
  async createFieldServiceOrder(@Body() data: CreateFieldServiceOrderDto, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.createFieldServiceOrder(data, tenantId);
  }

  @Put('field-service-orders/:id')
  @RequirePermission('field_service', 'update')
  async updateFieldServiceOrder(@Param('id') id: string, @Body() data: UpdateFieldServiceOrderDto, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.updateFieldServiceOrder(id, data, tenantId);
  }

  @Delete('field-service-orders/:id')
  @RequirePermission('field_service', 'delete')
  async deleteFieldServiceOrder(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.serviceManagementService.deleteFieldServiceOrder(id, tenantId);
    return { message: 'Field service order deleted successfully' };
  }

  @Get('field-service-orders/technician/:technicianId')
  @RequirePermission('field_service', 'read')
  async getFieldServiceOrdersByTechnician(@Param('technicianId') technicianId: string, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.getFieldServiceOrdersByTechnician(technicianId, tenantId);
  }

  // Service Contracts
  @Get('service-contracts')
  @RequirePermission('service_contract', 'read')
  async findAllServiceContracts(@CurrentTenant() tenantId: string) {
    return this.serviceManagementService.findAllServiceContracts(tenantId);
  }

  @Get('service-contracts/:id')
  @RequirePermission('service_contract', 'read')
  async findOneServiceContract(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.findOneServiceContract(id, tenantId);
  }

  // Knowledge Base
  @Get('knowledge-base')
  @RequirePermission('knowledge_base', 'read')
  async findAllKnowledgeBaseArticles(@CurrentTenant() tenantId: string) {
    return this.serviceManagementService.findAllKnowledgeBaseArticles(tenantId);
  }

  @Get('knowledge-base/:id')
  @RequirePermission('knowledge_base', 'read')
  async findOneKnowledgeBaseArticle(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.findOneKnowledgeBaseArticle(id, tenantId);
  }

  @Get('knowledge-base/search/:query')
  @RequirePermission('knowledge_base', 'read')
  async searchKnowledgeBase(@Param('query') query: string, @CurrentTenant() tenantId: string) {
    return this.serviceManagementService.searchKnowledgeBase(query, tenantId);
  }

  // ── Integrations ──────────────────────────────────────────────────────────

  @Get('integrations/config')
  async getIntegrationConfig(@CurrentTenant() tenantId: string) {
    const config = await this.integrationRepo.findOne({ where: { tenant_id: tenantId } });
    if (!config) return {};
    // Mask secrets
    return {
      ...config,
      trello_api_key: config.trello_api_key ? '••••' + config.trello_api_key.slice(-4) : null,
      trello_token: config.trello_token ? '••••' + config.trello_token.slice(-4) : null,
    };
  }

  @Put('integrations/config')
  async saveIntegrationConfig(@Body() body: Partial<TicketIntegrationEntity>, @CurrentTenant() tenantId: string) {
    let config = await this.integrationRepo.findOne({ where: { tenant_id: tenantId } });
    if (!config) {
      config = this.integrationRepo.create({ tenant_id: tenantId });
    }
    // Only update non-masked values
    if (body.slack_webhook_url !== undefined) config.slack_webhook_url = body.slack_webhook_url;
    if (body.slack_on_create !== undefined) config.slack_on_create = body.slack_on_create;
    if (body.slack_on_update !== undefined) config.slack_on_update = body.slack_on_update;
    if (body.slack_on_resolve !== undefined) config.slack_on_resolve = body.slack_on_resolve;
    if (body.trello_list_id !== undefined) config.trello_list_id = body.trello_list_id;
    if (body.trello_auto_push !== undefined) config.trello_auto_push = body.trello_auto_push;
    // Only update secrets if not masked
    if (body.trello_api_key && !body.trello_api_key.startsWith('••••')) config.trello_api_key = body.trello_api_key;
    if (body.trello_token && !body.trello_token.startsWith('••••')) config.trello_token = body.trello_token;
    return this.integrationRepo.save(config);
  }

  @Post('integrations/slack/test')
  async testSlack(@CurrentTenant() tenantId: string) {
    const config = await this.integrationRepo.findOne({ where: { tenant_id: tenantId } });
    if (!config?.slack_webhook_url) return { success: false, message: 'No Slack webhook configured' };
    const testTicket = { ticket_number: 'TEST-001', subject: 'Slack integration test', priority: 'medium', status: 'new', customer_name: 'Test User' } as any;
    await this.integrationsService.sendSlackNotification(config.slack_webhook_url, testTicket, 'created');
    return { success: true, message: 'Test notification sent' };
  }

  @Post('tickets/:id/push-trello')
  async pushTicketToTrello(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    const [ticket, config] = await Promise.all([
      this.serviceManagementService.findOneTicket(id, tenantId),
      this.integrationRepo.findOne({ where: { tenant_id: tenantId } }),
    ]);
    if (!config?.trello_api_key || !config?.trello_token || !config?.trello_list_id) {
      return { success: false, message: 'Trello not configured' };
    }
    const result = await this.integrationsService.pushToTrello(
      config.trello_api_key, config.trello_token, config.trello_list_id, ticket,
    );
    if (result) {
      await this.serviceManagementService.updateTicket(id, { trello_card_id: result.id, trello_card_url: result.url } as any, tenantId);
    }
    return result ?? { success: false, message: 'Trello push failed' };
  }

  // Kanban: move ticket to new status column
  @Patch('tickets/:id/move')
  async moveTicket(
    @Param('id') id: string,
    @Body('status') status: TicketStatus,
    @CurrentTenant() tenantId: string,
  ) {
    const ticket = await this.serviceManagementService.updateTicket(id, { status } as any, tenantId);
    // Fire Slack notification on status change
    const config = await this.integrationRepo.findOne({ where: { tenant_id: tenantId } });
    if (config?.slack_webhook_url && config.slack_on_update) {
      await this.integrationsService.sendSlackNotification(config.slack_webhook_url, ticket, 'updated');
    }
    // Sync Trello card if linked
    if (ticket.trello_card_id && config?.trello_api_key && config?.trello_token) {
      await this.integrationsService.updateTrelloCard(config.trello_api_key, config.trello_token, ticket.trello_card_id, ticket);
    }
    return ticket;
  }
}
