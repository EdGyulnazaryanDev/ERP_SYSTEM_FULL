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
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ServiceManagementService } from './service-management.service';
import { IntegrationsService } from './integrations.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PlanLimitKey } from '../subscriptions/subscription.constants';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketIntegrationEntity } from './entities/ticket-integration.entity';
import { IntegrationRequestEntity, IntegrationRequestStatus } from './entities/integration-request.entity';
import {
  CreateTicketDto,
  UpdateTicketDto,
  RateTicketDto,
} from './dto/create-ticket.dto';
import {
  CreateFieldServiceOrderDto,
  UpdateFieldServiceOrderDto,
} from './dto/create-field-service-order.dto';
import { TicketStatus } from './entities/service-ticket.entity';
import { ServiceOrderStatus } from './entities/field-service-order.entity';

@Controller('service-management')
@UseGuards(JwtAuthGuard)
export class ServiceManagementController {
  constructor(
    private readonly serviceManagementService: ServiceManagementService,
    private readonly integrationsService: IntegrationsService,
    private readonly subscriptionsService: SubscriptionsService,
    @InjectRepository(TicketIntegrationEntity)
    private readonly integrationRepo: Repository<TicketIntegrationEntity>,
    @InjectRepository(IntegrationRequestEntity)
    private readonly integrationRequestRepo: Repository<IntegrationRequestEntity>,
  ) {}

  // Tickets
  @Get('tickets')
  @RequirePermission('ticket', 'read')
  async findAllTickets(
    @CurrentTenant() tenantId: string,
  ) {
    console.log('🔍 Backend: Fetching tickets for tenant:', tenantId);
    const tickets = await this.serviceManagementService.findAllTickets(tenantId);
    console.log('🔍 Backend: Tickets found:', tickets?.length || 0);
    return { data: tickets };
  }

  @Get('tickets/:id')
  @RequirePermission('ticket', 'read')
  async findOneTicket(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.findOneTicket(id, tenantId);
  }

  @Post('tickets')
  @RequirePermission('ticket', 'create')
  async createTicket(
    @Body() data: any,
    @CurrentTenant() tenantId: string,
  ) {
    const ticket = await this.serviceManagementService.createTicket(data, tenantId);

    // If this ticket was spawned from a roadmap item, automatically link it.
    if (data.roadmap_item_id) {
      await this.serviceManagementService.updateRoadmapItemTicketLink(data.roadmap_item_id, ticket.id, tenantId);
    }

    // Send Slack notification for created ticket
    const config = await this.integrationRepo.findOne({
      where: { tenant_id: tenantId },
    });
    if (config?.slack_webhook_url && config.slack_on_create) {
      await this.integrationsService.sendSlackNotification(
        config.slack_webhook_url,
        ticket,
        'created',
      );
    }

    // Auto-push to Trello if enabled
    if (config?.trello_api_key && config?.trello_token && config?.trello_list_id && config.trello_auto_push) {
      const trelloResult = await this.integrationsService.pushToTrello(
        config.trello_api_key,
        config.trello_token,
        config.trello_list_id,
        ticket,
      );
      if (trelloResult) {
        await this.serviceManagementService.updateTicket(ticket.id, {
          trello_card_id: trelloResult.id,
          trello_card_url: trelloResult.url,
        } as any, tenantId);
      }
    }

    return ticket;
  }

  @Put('tickets/:id')
  @RequirePermission('ticket', 'update')
  async updateTicket(
    @Param('id') id: string,
    @Body() data: UpdateTicketDto,
    @CurrentTenant() tenantId: string,
  ) {
    const oldTicket = await this.serviceManagementService.findOneTicket(id, tenantId);
    const updatedTicket = await this.serviceManagementService.updateTicket(id, data, tenantId);

    // Send Slack notification for status change
    const config = await this.integrationRepo.findOne({
      where: { tenant_id: tenantId },
    });
    if (config?.slack_webhook_url && config.slack_on_update && oldTicket.status !== updatedTicket.status) {
      await this.integrationsService.sendSlackNotification(
        config.slack_webhook_url,
        updatedTicket,
        'updated',
      );
    }

    // Update Trello card if it exists
    if (updatedTicket.trello_card_id && config?.trello_api_key && config?.trello_token) {
      await this.integrationsService.updateTrelloCard(
        config.trello_api_key,
        config.trello_token,
        updatedTicket.trello_card_id,
        updatedTicket,
      );
    }

    return updatedTicket;
  }

  @Delete('tickets/:id')
  @RequirePermission('ticket', 'delete')
  async deleteTicket(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.serviceManagementService.deleteTicket(id, tenantId);
    return { message: 'Ticket deleted successfully' };
  }

  @Post('tickets/:id/assign')
  @RequirePermission('ticket', 'update')
  async assignTicket(
    @Param('id') id: string,
    @Body('assignedTo') assignedTo: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.assignTicket(id, assignedTo, tenantId);
  }

  @Post('tickets/:id/respond')
  @RequirePermission('ticket', 'update')
  async respondToTicket(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.respondToTicket(id, tenantId);
  }

  @Post('tickets/:id/resolve')
  @RequirePermission('ticket', 'update')
  async resolveTicket(
    @Param('id') id: string,
    @Body() body: { resolution_notes: string },
    @CurrentTenant() tenantId: string,
  ) {
    const resolvedTicket = await this.serviceManagementService.resolveTicket(id, body.resolution_notes, tenantId);

    // Send Slack notification for resolved ticket
    const config = await this.integrationRepo.findOne({
      where: { tenant_id: tenantId },
    });
    if (config?.slack_webhook_url && config.slack_on_resolve) {
      await this.integrationsService.sendSlackNotification(
        config.slack_webhook_url,
        resolvedTicket,
        'resolved',
      );
    }

    return resolvedTicket;
  }

  @Post('tickets/:id/close')
  @RequirePermission('ticket', 'update')
  async closeTicket(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.closeTicket(id, tenantId);
  }

  @Post('tickets/:id/rate')
  @RequirePermission('ticket', 'read')
  async rateTicket(
    @Param('id') id: string,
    @Body() data: RateTicketDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.rateTicket(id, data, tenantId);
  }

  @Get('tickets/assignee/:assigneeId')
  @RequirePermission('ticket', 'read')
  async getTicketsByAssignee(
    @Param('assigneeId') assigneeId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.getTicketsByAssignee(
      assigneeId,
      tenantId,
    );
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
  async findAllFieldServiceOrders(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: ServiceOrderStatus,
  ) {
    return this.serviceManagementService.findAllFieldServiceOrders(
      tenantId,
      status,
    );
  }

  @Get('field-service-orders/:id')
  @RequirePermission('field_service', 'read')
  async findOneFieldServiceOrder(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.findOneFieldServiceOrder(id, tenantId);
  }

  @Post('field-service-orders')
  @RequirePermission('field_service', 'create')
  async createFieldServiceOrder(
    @Body() data: CreateFieldServiceOrderDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.createFieldServiceOrder(
      data,
      tenantId,
    );
  }

  @Put('field-service-orders/:id')
  @RequirePermission('field_service', 'update')
  async updateFieldServiceOrder(
    @Param('id') id: string,
    @Body() data: UpdateFieldServiceOrderDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.updateFieldServiceOrder(
      id,
      data,
      tenantId,
    );
  }

  @Delete('field-service-orders/:id')
  @RequirePermission('field_service', 'delete')
  async deleteFieldServiceOrder(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.serviceManagementService.deleteFieldServiceOrder(id, tenantId);
    return { message: 'Field service order deleted successfully' };
  }

  @Get('field-service-orders/technician/:technicianId')
  @RequirePermission('field_service', 'read')
  async getFieldServiceOrdersByTechnician(
    @Param('technicianId') technicianId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.getFieldServiceOrdersByTechnician(
      technicianId,
      tenantId,
    );
  }

  // Service Contracts
  @Get('service-contracts')
  @RequirePermission('service_contract', 'read')
  async findAllServiceContracts(@CurrentTenant() tenantId: string) {
    console.log('🔍 Backend: Fetching service contracts');
    const contracts = await this.serviceManagementService.findAllServiceContracts(tenantId);
    console.log('🔍 Backend: Service contracts found:', contracts?.length || 0);
    return { data: contracts };
  }

  @Get('service-contracts/:id')
  @RequirePermission('service_contract', 'read')
  async findOneServiceContract(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.findOneServiceContract(id, tenantId);
  }

  @Post('service-contracts')
  @RequirePermission('service_contract', 'create')
  async createServiceContract(
    @Body() data: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.createServiceContract(data, tenantId);
  }

  @Put('service-contracts/:id')
  @RequirePermission('service_contract', 'update')
  async updateServiceContract(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.updateServiceContract(id, data, tenantId);
  }

  @Delete('service-contracts/:id')
  @RequirePermission('service_contract', 'delete')
  async deleteServiceContract(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.serviceManagementService.deleteServiceContract(id, tenantId);
    return { message: 'Service contract deleted successfully' };
  }

  // Knowledge Base
  @Get('knowledge-base')
  @RequirePermission('knowledge_base', 'read')
  async findAllKnowledgeBaseArticles(@CurrentTenant() tenantId: string) {
    return this.serviceManagementService.findAllKnowledgeBaseArticles(tenantId);
  }

  @Get('knowledge-base/:id')
  @RequirePermission('knowledge_base', 'read')
  async findOneKnowledgeBaseArticle(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.findOneKnowledgeBaseArticle(
      id,
      tenantId,
    );
  }

  @Get('knowledge-base/search/:query')
  @RequirePermission('knowledge_base', 'read')
  async searchKnowledgeBase(
    @Param('query') query: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.searchKnowledgeBase(query, tenantId);
  }

  // ── Integrations ──────────────────────────────────────────────────────────

  @Get('integrations/config')
  async getIntegrationConfig(@CurrentTenant() tenantId: string) {
    const config = await this.integrationRepo.findOne({
      where: { tenant_id: tenantId },
    });
    if (!config) return {};
    // Mask secrets and explicitly cast tinyint DB values strictly to booleans for the UI
    return {
      ...config,
      slack_on_create: !!config.slack_on_create,
      slack_on_update: !!config.slack_on_update,
      slack_on_resolve: !!config.slack_on_resolve,
      trello_auto_push: !!config.trello_auto_push,
      trello_api_key: config.trello_api_key
        ? '••••' + config.trello_api_key.slice(-4)
        : null,
      trello_token: config.trello_token
        ? '••••' + config.trello_token.slice(-4)
        : null,
    };
  }

  @Patch('integrations/config')
  async updateIntegrationConfig(
    @Body() body: any,
    @CurrentTenant() tenantId: string,
  ) {
    let config = await this.integrationRepo.findOne({
      where: { tenant_id: tenantId },
    });

    const isNew = !config;

    if (!config) {
      config = this.integrationRepo.create({
        tenant_id: tenantId,
        slack_webhook_url: null,
        slack_on_create: false,
        slack_on_update: false,
        slack_on_resolve: false,
        trello_api_key: null,
        trello_token: null,
        trello_list_id: null,
        trello_auto_push: false,
      });
    }

    // Count how many integrations are currently active and how many new ones are being added
    const currentCount = this.countActiveIntegrations(config);
    const newCount = this.countActiveIntegrations({ ...config, ...this.extractIntegrationFields(body) } as TicketIntegrationEntity);
    const addedCount = Math.max(0, newCount - currentCount);

    if (addedCount > 0 || isNew) {
      // Check if they have bypassed via a request for the specific ones they are trying to activate
      let bypassCount = 0;
      
      const approvedRequests = await this.integrationRequestRepo.find({
        where: { tenant_id: tenantId, status: IntegrationRequestStatus.APPROVED }
      });
      
      if (body.slack_webhook_url && !config.slack_webhook_url && approvedRequests.some(r => r.integration_name === 'slack')) {
        bypassCount++;
      }
      if (body.trello_api_key && !config.trello_api_key && approvedRequests.some(r => r.integration_name === 'trello')) {
        bypassCount++;
      }

      const effectiveAddedCount = Math.max(0, addedCount - bypassCount);

      if (effectiveAddedCount > 0) {
        await this.subscriptionsService.assertWithinLimit(
          tenantId,
          PlanLimitKey.INTEGRATIONS,
          currentCount,
          effectiveAddedCount,
        );
      }
    }

    // Update fields
    if (body.slack_webhook_url !== undefined)
      config.slack_webhook_url = body.slack_webhook_url;
    if (body.slack_on_create !== undefined)
      config.slack_on_create = body.slack_on_create;
    if (body.slack_on_update !== undefined)
      config.slack_on_update = body.slack_on_update;
    if (body.slack_on_resolve !== undefined)
      config.slack_on_resolve = body.slack_on_resolve;
    if (body.trello_list_id !== undefined)
      config.trello_list_id = body.trello_list_id;
    if (body.trello_auto_push !== undefined)
      config.trello_auto_push = body.trello_auto_push;

    if (body.trello_api_key && !body.trello_api_key.startsWith('••••'))
      config.trello_api_key = body.trello_api_key;
    if (body.trello_token && !body.trello_token.startsWith('••••'))
      config.trello_token = body.trello_token;

    // Track integration activation for platform admin
    const updatedConfig = await this.integrationRepo.save(config);
    
    // Notify platform admin of new integration connections
    if (this.isNewIntegrationConnection(config, body)) {
      await this.notifyPlatformAdmin(tenantId, body);
    }

    return updatedConfig;
  }

  // ── Integration Requests ──────────────────────────────────────────────────────────

  @Get('integrations/requests')
  async getIntegrationRequests(@CurrentTenant() tenantId: string) {
    // If system admin (null tenant), get all requests. Else limit to tenant
    const where = tenantId ? { tenant_id: tenantId } : {};
    return this.integrationRequestRepo.find({ where, order: { created_at: 'DESC' } });
  }

  @Post('integrations/requests')
  async requestIntegrationUnlock(@Body() body: { integration_name: string }, @CurrentTenant() tenantId: string) {
    if (!tenantId) throw new Error('System Admin does not need to request integrations');
    
    // Check if pending/approved already exists
    const existing = await this.integrationRequestRepo.findOne({
      where: { tenant_id: tenantId, integration_name: body.integration_name }
    });
    if (existing) {
      if (existing.status === IntegrationRequestStatus.REJECTED) {
         existing.status = IntegrationRequestStatus.PENDING;
         return this.integrationRequestRepo.save(existing);
      }
      return existing; 
    }

    const request = this.integrationRequestRepo.create({
      tenant_id: tenantId,
      integration_name: body.integration_name,
      status: IntegrationRequestStatus.PENDING,
    });
    return this.integrationRequestRepo.save(request);
  }

  @Patch('integrations/requests/:id')
  async updateIntegrationRequest(
    @Param('id') id: string,
    @Body() body: { status: IntegrationRequestStatus }
  ) {
    const request = await this.integrationRequestRepo.findOne({ where: { id } });
    if (!request) throw new Error('Request not found');
    request.status = body.status;
    return this.integrationRequestRepo.save(request);
  }

  /** Count distinct active integrations (one per provider) */
  private countActiveIntegrations(config: Partial<TicketIntegrationEntity>): number {
    let count = 0;
    if (config.slack_webhook_url) count++;
    if (config.trello_list_id) count++;
    if (config.jira_api_key) count++;
    if (config.github_token) count++;
    if (config.stripe_secret_key) count++;
    if (config.quickbooks_client_id) count++;
    if (config.google_workspace_service_account) count++;
    return count;
  }

  /** Extract integration credential fields from request body */
  private extractIntegrationFields(body: any): Partial<TicketIntegrationEntity> {
    const fields: Partial<TicketIntegrationEntity> = {};
    if (body.slack_webhook_url !== undefined) fields.slack_webhook_url = body.slack_webhook_url;
    if (body.trello_list_id !== undefined) fields.trello_list_id = body.trello_list_id;
    if (body.jira_api_key !== undefined) fields.jira_api_key = body.jira_api_key;
    if (body.github_token !== undefined) fields.github_token = body.github_token;
    if (body.stripe_secret_key !== undefined) fields.stripe_secret_key = body.stripe_secret_key;
    if (body.quickbooks_client_id !== undefined) fields.quickbooks_client_id = body.quickbooks_client_id;
    if (body.google_workspace_service_account !== undefined) fields.google_workspace_service_account = body.google_workspace_service_account;
    return fields;
  }

  private isNewIntegrationConnection(config: any, body: any): boolean {
    return (
      (body.slack_webhook_url && !config.slack_webhook_url) ||
      (body.trello_list_id && !config.trello_list_id)
    );
  }

  private async notifyPlatformAdmin(tenantId: string, integration: any): Promise<void> {
    // This would send notification to platform admin
    // Implementation depends on your notification system
    console.log(`Tenant ${tenantId} connected integration:`, integration);
  }

  @Post('integrations/slack/test')
  async testSlack(@CurrentTenant() tenantId: string) {
    const config = await this.integrationRepo.findOne({
      where: { tenant_id: tenantId },
    });
    if (!config?.slack_webhook_url)
      return { success: false, message: 'No Slack webhook configured' };
    const testTicket = {
      ticket_number: 'TEST-001',
      subject: 'Slack integration test',
      priority: 'medium',
      status: 'new',
      customer_name: 'Test User',
    } as any;
    await this.integrationsService.sendSlackNotification(
      config.slack_webhook_url,
      testTicket,
      'created',
    );
    return { success: true, message: 'Test notification sent' };
  }

  @Get('integrations/trello/lists')
  async getTrelloLists(@CurrentTenant() tenantId: string) {
    const config = await this.integrationRepo.findOne({
      where: { tenant_id: tenantId },
    });

    if (!config?.trello_api_key || !config?.trello_token) {
      return { success: false, message: 'Trello not configured' };
    }

    return this.integrationsService.getTrelloLists(
      config.trello_api_key,
      config.trello_token,
    );
  }

  @Post('integrations/trello/test')
  async testTrello(@CurrentTenant() tenantId: string) {
    const config = await this.integrationRepo.findOne({
      where: { tenant_id: tenantId },
    });

    if (
      !config?.trello_api_key ||
      !config?.trello_token ||
      !config?.trello_list_id
    ) {
      return { success: false, message: 'Trello not configured' };
    }

    return this.integrationsService.testTrelloConnection(
      config.trello_api_key,
      config.trello_token,
      config.trello_list_id,
    );
  }

  @Post('tickets/:id/push-trello')
  async pushTicketToTrello(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @Body() body: { listId?: string },
  ) {
    const [ticket, config] = await Promise.all([
      this.serviceManagementService.findOneTicket(id, tenantId),
      this.integrationRepo.findOne({ where: { tenant_id: tenantId } }),
    ]);
    
    const listId = body.listId || config?.trello_list_id;
    
    if (
      !config?.trello_api_key ||
      !config?.trello_token ||
      !listId
    ) {
      return { success: false, message: 'Trello not configured' };
    }
    const result = await this.integrationsService.pushToTrello(
      config.trello_api_key,
      config.trello_token,
      listId,
      ticket,
    );
    if (result) {
      await this.serviceManagementService.updateTicket(
        id,
        { trello_card_id: result.id, trello_card_url: result.url } as any,
        tenantId,
      );
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
    const ticket = await this.serviceManagementService.updateTicket(
      id,
      { status } as any,
      tenantId,
    );
    // Fire Slack notification on status change
    const config = await this.integrationRepo.findOne({
      where: { tenant_id: tenantId },
    });
    if (config?.slack_webhook_url && config.slack_on_update) {
      await this.integrationsService.sendSlackNotification(
        config.slack_webhook_url,
        ticket,
        'updated',
      );
    }
    // Sync Trello card if linked
    if (
      ticket.trello_card_id &&
      config?.trello_api_key &&
      config?.trello_token
    ) {
      await this.integrationsService.updateTrelloCard(
        config.trello_api_key,
        config.trello_token,
        ticket.trello_card_id,
        ticket,
      );
    }
    return ticket;
  }

  // ── Roadmap ──────────────────────────────────────────────────────────

  @Get('roadmap')
  async getRoadmap(@CurrentTenant() tenantId: string) {
    return this.serviceManagementService.getRoadmap(tenantId);
  }

  @Post('roadmap/categories')
  async createRoadmapCategory(
    @Body() data: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.createRoadmapCategory(data, tenantId);
  }

  @Post('roadmap/items')
  async createRoadmapItem(
    @Body() data: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.serviceManagementService.createRoadmapItem(data, tenantId);
  }

  @Delete('roadmap/categories/:id')
  async deleteRoadmapCategory(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.serviceManagementService.deleteRoadmapCategory(id, tenantId);
    return { success: true };
  }

  @Delete('roadmap/items/:id')
  async deleteRoadmapItem(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.serviceManagementService.deleteRoadmapItem(id, tenantId);
    return { success: true };
  }
}
