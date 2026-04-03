import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ServiceTicketEntity, TicketStatus } from './entities/service-ticket.entity';
import { TicketCategoryEntity } from './entities/ticket-category.entity';
import { SLAPolicyEntity } from './entities/sla-policy.entity';
import { SLAViolationEntity, ViolationType } from './entities/sla-violation.entity';
import { FieldServiceOrderEntity, ServiceOrderStatus } from './entities/field-service-order.entity';
import { ServiceContractEntity } from './entities/service-contract.entity';
import { KnowledgeBaseArticleEntity } from './entities/knowledge-base-article.entity';
import { TicketIntegrationEntity } from './entities/ticket-integration.entity';
import { RoadmapCategoryEntity } from './entities/roadmap-category.entity';
import { RoadmapItemEntity } from './entities/roadmap-item.entity';
import type { CreateTicketDto, UpdateTicketDto, RateTicketDto } from './dto/create-ticket.dto';
import type { CreateFieldServiceOrderDto, UpdateFieldServiceOrderDto } from './dto/create-field-service-order.dto';

@Injectable()
export class ServiceManagementService {
  private readonly logger = new Logger(ServiceManagementService.name);

  constructor(
    @InjectRepository(ServiceTicketEntity)
    private ticketRepository: Repository<ServiceTicketEntity>,
    @InjectRepository(TicketCategoryEntity)
    private categoryRepository: Repository<TicketCategoryEntity>,
    @InjectRepository(SLAPolicyEntity)
    private slaPolicyRepository: Repository<SLAPolicyEntity>,
    @InjectRepository(SLAViolationEntity)
    private slaViolationRepository: Repository<SLAViolationEntity>,
    @InjectRepository(FieldServiceOrderEntity)
    private fieldServiceOrderRepository: Repository<FieldServiceOrderEntity>,
    @InjectRepository(ServiceContractEntity)
    private serviceContractRepository: Repository<ServiceContractEntity>,
    @InjectRepository(KnowledgeBaseArticleEntity)
    private knowledgeBaseRepository: Repository<KnowledgeBaseArticleEntity>,
    @InjectRepository(TicketIntegrationEntity)
    private integrationRepository: Repository<TicketIntegrationEntity>,
    @InjectRepository(RoadmapCategoryEntity)
    private roadmapCategoryRepository: Repository<RoadmapCategoryEntity>,
    @InjectRepository(RoadmapItemEntity)
    private roadmapItemRepository: Repository<RoadmapItemEntity>,
  ) {}

  async getIntegrationConfig(tenantId: string | null): Promise<TicketIntegrationEntity | null> {
    if (!tenantId) return null;
    return this.integrationRepository.findOne({ where: { tenant_id: tenantId } });
  }

  // Ticket Management
  async findAllTickets(tenantId: string | null, status?: TicketStatus): Promise<ServiceTicketEntity[]> {
    const where: any = {};
    if (tenantId) {
      where.tenant_id = tenantId;
    } else {
      where.tenant_id = IsNull(); // null = system admin platform tickets
    }
    if (status) where.status = status;

    return this.ticketRepository.find({
      where,
      relations: ['category'],
      order: { created_at: 'DESC' },
    });
  }

  async findOneTicket(id: string, tenantId: string | null): Promise<ServiceTicketEntity> {
    const where: any = { id };
    if (tenantId) {
      where.tenant_id = tenantId;
    } else {
      where.tenant_id = IsNull();
    }
    const ticket = await this.ticketRepository.findOne({
      where,
      relations: ['category'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    return ticket;
  }

  async createTicket(data: CreateTicketDto, tenantId: string | null): Promise<ServiceTicketEntity> {
    console.log('🔍 Backend: Creating ticket with tenantId:', tenantId);
    let count = await this.ticketRepository.count(
      tenantId ? { where: { tenant_id: tenantId } } : undefined,
    );
    
    // Auto-retry to handle duplicate ticket_number constraints under concurrent creations
    for (let attempts = 0; attempts < 10; attempts++) {
      const ticketNumber = `TK-${String(count + 1 + attempts).padStart(5, '0')}`;
      try {
        const ticket = this.ticketRepository.create({
          ...data,
          ticket_number: ticketNumber,
          tenant_id: tenantId,
          status: TicketStatus.NEW,
        });
        const saved = await this.ticketRepository.save(ticket);
        console.log('🔍 Backend: Created ticket with number:', ticketNumber);
        return saved;
      } catch (e: any) {
        // 23505 is PostgreSQL unique violation constraint error
        if (e.code === '23505') {
          console.warn(`🔍 Backend: Ticket number ${ticketNumber} taken (or another unique conflict), retrying...`);
          continue;
        }
        throw e;
      }
    }
    
    throw new Error('Failed to generate a unique ticket number after multiple attempts.');
  }

  async updateTicket(id: string, data: UpdateTicketDto, tenantId: string | null): Promise<ServiceTicketEntity> {
    const ticket = await this.findOneTicket(id, tenantId);

    Object.assign(ticket, data);
    return this.ticketRepository.save(ticket);
  }

  async deleteTicket(id: string, tenantId: string): Promise<void> {
    const ticket = await this.findOneTicket(id, tenantId);
    
    // Unlink any roadmap items tracking this ticket
    await this.roadmapItemRepository.update({ ticket_id: id }, { ticket_id: null });
    
    await this.ticketRepository.remove(ticket);
  }

  async assignTicket(id: string, assignedTo: string, tenantId: string): Promise<ServiceTicketEntity> {
    const ticket = await this.findOneTicket(id, tenantId);

    ticket.assigned_to = assignedTo;
    if (ticket.status === TicketStatus.NEW) {
      ticket.status = TicketStatus.OPEN;
    }

    return this.ticketRepository.save(ticket);
  }

  async respondToTicket(id: string, tenantId: string): Promise<ServiceTicketEntity> {
    const ticket = await this.findOneTicket(id, tenantId);

    if (!ticket.first_response_at) {
      ticket.first_response_at = new Date();
      const responseTime = Math.floor((ticket.first_response_at.getTime() - ticket.created_at.getTime()) / 60000);
      ticket.response_time_minutes = responseTime;

      // Check for SLA violation
      if (ticket.sla_policy_id) {
        const slaPolicy = await this.slaPolicyRepository.findOne({
          where: { id: ticket.sla_policy_id, tenant_id: tenantId },
        });

        if (slaPolicy && responseTime > slaPolicy.first_response_time_minutes) {
          await this.createSLAViolation(
            ticket.id,
            ticket.sla_policy_id,
            ViolationType.FIRST_RESPONSE,
            responseTime - slaPolicy.first_response_time_minutes,
            tenantId,
          );
        }
      }
    }

    return this.ticketRepository.save(ticket);
  }

  async resolveTicket(id: string, resolutionNotes: string, tenantId: string): Promise<ServiceTicketEntity> {
    const ticket = await this.findOneTicket(id, tenantId);

    ticket.status = TicketStatus.RESOLVED;
    ticket.resolution_notes = resolutionNotes;
    ticket.resolved_at = new Date();
    
    return this.ticketRepository.save(ticket);
  }

  async closeTicket(id: string, tenantId: string): Promise<ServiceTicketEntity> {
    const ticket = await this.findOneTicket(id, tenantId);

    if (ticket.status !== TicketStatus.RESOLVED) {
      throw new Error('Only resolved tickets can be closed');
    }

    ticket.status = TicketStatus.CLOSED;
    ticket.closed_at = new Date();

    return this.ticketRepository.save(ticket);
  }

  async rateTicket(id: string, data: RateTicketDto, tenantId: string): Promise<ServiceTicketEntity> {
    const ticket = await this.findOneTicket(id, tenantId);

    ticket.satisfaction_rating = data.satisfaction_rating;
    ticket.satisfaction_feedback = data.satisfaction_feedback || '';

    return this.ticketRepository.save(ticket);
  }

  async getTicketsByAssignee(assigneeId: string, tenantId: string): Promise<ServiceTicketEntity[]> {
    return this.ticketRepository.find({
      where: { assigned_to: assigneeId, tenant_id: tenantId },
      relations: ['category'],
      order: { created_at: 'DESC' },
    });
  }

  // SLA Management
  private async createSLAViolation(
    ticketId: string,
    slaPolicyId: string,
    violationType: ViolationType,
    delayMinutes: number,
    tenantId: string,
  ): Promise<void> {
    const violation = this.slaViolationRepository.create({
      ticket_id: ticketId,
      sla_policy_id: slaPolicyId,
      violation_type: violationType,
      expected_time: new Date(),
      actual_time: new Date(),
      delay_minutes: delayMinutes,
      tenant_id: tenantId,
    });

    await this.slaViolationRepository.save(violation);
  }

  async getSLAViolations(tenantId: string): Promise<SLAViolationEntity[]> {
    return this.slaViolationRepository.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  // Field Service Orders
  async findAllFieldServiceOrders(tenantId: string, status?: ServiceOrderStatus): Promise<FieldServiceOrderEntity[]> {
    const where: any = { tenant_id: tenantId };
    if (status) {
      where.status = status;
    }

    return this.fieldServiceOrderRepository.find({
      where,
      order: { scheduled_start: 'ASC' },
    });
  }

  async findOneFieldServiceOrder(id: string, tenantId: string): Promise<FieldServiceOrderEntity> {
    const order = await this.fieldServiceOrderRepository.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!order) {
      throw new NotFoundException(`Field service order with ID ${id} not found`);
    }

    return order;
  }

  async createFieldServiceOrder(data: CreateFieldServiceOrderDto, tenantId: string): Promise<FieldServiceOrderEntity> {
    // Generate order number
    const count = await this.fieldServiceOrderRepository.count({ where: { tenant_id: tenantId } });
    const orderNumber = `FSO-${String(count + 1).padStart(6, '0')}`;

    const order = this.fieldServiceOrderRepository.create({
      ...data,
      order_number: orderNumber,
      tenant_id: tenantId,
    });

    return this.fieldServiceOrderRepository.save(order);
  }

  async updateFieldServiceOrder(id: string, data: UpdateFieldServiceOrderDto, tenantId: string): Promise<FieldServiceOrderEntity> {
    const order = await this.findOneFieldServiceOrder(id, tenantId);

    Object.assign(order, data);

    return this.fieldServiceOrderRepository.save(order);
  }

  async deleteFieldServiceOrder(id: string, tenantId: string): Promise<void> {
    const order = await this.findOneFieldServiceOrder(id, tenantId);
    await this.fieldServiceOrderRepository.remove(order);
  }

  async getFieldServiceOrdersByTechnician(technicianId: string, tenantId: string): Promise<FieldServiceOrderEntity[]> {
    return this.fieldServiceOrderRepository.find({
      where: { assigned_technician: technicianId, tenant_id: tenantId },
      order: { scheduled_start: 'ASC' },
    });
  }

  // Service Contracts
  async findAllServiceContracts(tenantId: string): Promise<ServiceContractEntity[]> {
    return this.serviceContractRepository.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async findOneServiceContract(id: string, tenantId: string): Promise<ServiceContractEntity> {
    const contract = await this.serviceContractRepository.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!contract) {
      throw new NotFoundException(`Service contract with ID ${id} not found`);
    }

    return contract;
  }

  async createServiceContract(data: any, tenantId: string): Promise<ServiceContractEntity> {
    const contract = this.serviceContractRepository.create({
      ...data,
      tenant_id: tenantId,
    });
    return this.serviceContractRepository.save(contract as unknown as ServiceContractEntity);
  }

  async updateServiceContract(id: string, data: any, tenantId: string): Promise<ServiceContractEntity> {
    const contract = await this.findOneServiceContract(id, tenantId);
    Object.assign(contract, data);
    return this.serviceContractRepository.save(contract);
  }

  async deleteServiceContract(id: string, tenantId: string): Promise<void> {
    const contract = await this.findOneServiceContract(id, tenantId);
    await this.serviceContractRepository.remove(contract);
  }

  // Knowledge Base
  async findAllKnowledgeBaseArticles(tenantId: string): Promise<KnowledgeBaseArticleEntity[]> {
    return this.knowledgeBaseRepository.find({
      where: { tenant_id: tenantId },
      order: { view_count: 'DESC' },
    });
  }

  async findOneKnowledgeBaseArticle(id: string, tenantId: string): Promise<KnowledgeBaseArticleEntity> {
    const article = await this.knowledgeBaseRepository.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!article) {
      throw new NotFoundException(`Knowledge base article with ID ${id} not found`);
    }

    // Increment view count
    article.view_count += 1;
    await this.knowledgeBaseRepository.save(article);

    return article;
  }

  async searchKnowledgeBase(query: string, tenantId: string): Promise<KnowledgeBaseArticleEntity[]> {
    return this.knowledgeBaseRepository
      .createQueryBuilder('article')
      .where('article.tenant_id = :tenantId', { tenantId })
      .andWhere('(article.title ILIKE :query OR article.content ILIKE :query OR article.summary ILIKE :query)', {
        query: `%${query}%`,
      })
      .orderBy('article.view_count', 'DESC')
      .getMany();
  }

  // Roadmap Management
  async getRoadmap(tenantId: string | null): Promise<RoadmapCategoryEntity[]> {
    const where: any = {};
    if (tenantId) where.tenant_id = tenantId;
    else where.tenant_id = IsNull();

    return this.roadmapCategoryRepository.find({
      where,
      relations: ['items'],
      order: {
        sort_order: 'ASC',
        created_at: 'ASC',
      },
    });
  }

  async createRoadmapCategory(data: any, tenantId: string | null): Promise<RoadmapCategoryEntity> {
    const category = this.roadmapCategoryRepository.create({
      ...data,
      tenant_id: tenantId,
    });
    return this.roadmapCategoryRepository.save(category as any);
  }

  async createRoadmapItem(data: any, tenantId: string | null): Promise<RoadmapItemEntity> {
    const item = this.roadmapItemRepository.create({
      ...data,
      tenant_id: tenantId,
    });
    return this.roadmapItemRepository.save(item as any);
  }

  async updateRoadmapItemTicketLink(id: string, ticketId: string, tenantId: string | null): Promise<void> {
    const item = await this.roadmapItemRepository.findOne({ where: { id, tenant_id: tenantId ? tenantId : IsNull() } });
    if (item) {
      item.ticket_id = ticketId;
      await this.roadmapItemRepository.save(item);
    }
  }

  async deleteRoadmapCategory(id: string, tenantId: string | null): Promise<void> {
    const category = await this.roadmapCategoryRepository.findOne({ where: { id, tenant_id: tenantId ? tenantId : IsNull() } });
    if (category) {
      await this.roadmapCategoryRepository.remove(category);
    }
  }

  async deleteRoadmapItem(id: string, tenantId: string | null): Promise<void> {
    const item = await this.roadmapItemRepository.findOne({ where: { id, tenant_id: tenantId ? tenantId : IsNull() } });
    if (item) {
      await this.roadmapItemRepository.remove(item);
    }
  }
}
