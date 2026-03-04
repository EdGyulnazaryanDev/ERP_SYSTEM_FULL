import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ServiceManagementService } from './service-management.service';
import { CreateTicketDto, UpdateTicketDto, RateTicketDto } from './dto/create-ticket.dto';
import { CreateFieldServiceOrderDto, UpdateFieldServiceOrderDto } from './dto/create-field-service-order.dto';
import { TicketStatus } from './entities/service-ticket.entity';
import { ServiceOrderStatus } from './entities/field-service-order.entity';

@Controller('service-management')
@UseGuards(JwtAuthGuard)
export class ServiceManagementController {
  constructor(private readonly serviceManagementService: ServiceManagementService) { }

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
}
