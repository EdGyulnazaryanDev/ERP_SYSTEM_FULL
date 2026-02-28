import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceTicketEntity, TicketStatus } from './entities/service-ticket.entity';
import { TicketCategoryEntity } from './entities/ticket-category.entity';
import { SLAPolicyEntity } from './entities/sla-policy.entity';
import { SLAViolationEntity, ViolationType } from './entities/sla-violation.entity';
import { FieldServiceOrderEntity, ServiceOrderStatus } from './entities/field-service-order.entity';
import { ServiceContractEntity } from './entities/service-contract.entity';
import { KnowledgeBaseArticleEntity } from './entities/knowledge-base-article.entity';
import type { CreateTicketDto, UpdateTicketDto, RateTicketDto } from './dto/create-ticket.dto';
import type { CreateFieldServiceOrderDto, UpdateFieldServiceOrderDto } from './dto/create-field-service-order.dto';

@Injectable()
export class ServiceManagementService {
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
  ) {}

  // Ticket Management
  async findAllTickets(tenantId: string, status?: TicketStatus): Promise<ServiceTicketEntity[]> {
    const where: any = { tenant_id: tenantId };
    if (status) {
      where.status = status;
    }

    return this.ticketRepository.find({
      where,
      relations: ['category'],
      order: { created_at: 'DESC' },
    });
  }

  async findOneTicket(id: string, tenantId: string): Promise<ServiceTicketEntity> {
    const ticket = await this.ticketRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['category'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    return ticket;
  }

  async createTicket(data: CreateTicketDto, tenantId: string): Promise<ServiceTicketEntity> {
    // Generate ticket number
    const count = await this.ticketRepository.count({ where: { tenant_id: tenantId } });
    const ticketNumber = `TKT-${String(count + 1).padStart(6, '0')}`;

    // Get category to check for default SLA
    const category = await this.categoryRepository.findOne({
      where: { id: data.category_id, tenant_id: tenantId },
    });

    let slaPolicyId = null;
    let dueDate = null;

    if (category?.default_sla_policy_id) {
      slaPolicyId = category.default_sla_policy_id;
      const slaPolicy = await this.slaPolicyRepository.findOne({
        where: { id: slaPolicyId, tenant_id: tenantId },
      });

      if (slaPolicy) {
        // Calculate due date based on SLA
        const now = new Date();
        dueDate = new Date(now.getTime() + slaPolicy.resolution_time_minutes * 60000);
      }
    }

    const ticket = this.ticketRepository.create({
      ...data,
      ticket_number: ticketNumber,
      sla_policy_id: slaPolicyId,
      due_date: dueDate,
      tenant_id: tenantId,
    });

    return this.ticketRepository.save(ticket);
  }

  async updateTicket(id: string, data: UpdateTicketDto, tenantId: string): Promise<ServiceTicketEntity> {
    const ticket = await this.findOneTicket(id, tenantId);

    Object.assign(ticket, data);

    return this.ticketRepository.save(ticket);
  }

  async deleteTicket(id: string, tenantId: string): Promise<void> {
    const ticket = await this.findOneTicket(id, tenantId);
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
    ticket.resolved_at = new Date();
    ticket.resolution_notes = resolutionNotes;

    const resolutionTime = Math.floor((ticket.resolved_at.getTime() - ticket.created_at.getTime()) / 60000);
    ticket.resolution_time_minutes = resolutionTime;

    // Check for SLA violation
    if (ticket.sla_policy_id) {
      const slaPolicy = await this.slaPolicyRepository.findOne({
        where: { id: ticket.sla_policy_id, tenant_id: tenantId },
      });

      if (slaPolicy && resolutionTime > slaPolicy.resolution_time_minutes) {
        await this.createSLAViolation(
          ticket.id,
          ticket.sla_policy_id,
          ViolationType.RESOLUTION,
          resolutionTime - slaPolicy.resolution_time_minutes,
          tenantId,
        );
      }
    }

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
    ticket.satisfaction_feedback = data.satisfaction_feedback;

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
}
