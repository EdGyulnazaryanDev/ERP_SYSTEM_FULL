import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ServiceManagementService } from './service-management.service';
import { ServiceTicketEntity, TicketStatus, TicketPriority } from './entities/service-ticket.entity';
import { TicketCategoryEntity } from './entities/ticket-category.entity';
import { SLAPolicyEntity } from './entities/sla-policy.entity';
import { SLAViolationEntity } from './entities/sla-violation.entity';
import { FieldServiceOrderEntity, ServiceOrderStatus } from './entities/field-service-order.entity';
import { ServiceContractEntity } from './entities/service-contract.entity';
import { KnowledgeBaseArticleEntity } from './entities/knowledge-base-article.entity';

describe('ServiceManagementService', () => {
  let service: ServiceManagementService;
  let ticketRepository: Repository<ServiceTicketEntity>;
  let categoryRepository: Repository<TicketCategoryEntity>;
  let slaPolicyRepository: Repository<SLAPolicyEntity>;
  let fieldServiceOrderRepository: Repository<FieldServiceOrderEntity>;

  const mockTicketRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockCategoryRepository = {
    findOne: jest.fn(),
  };

  const mockSLAPolicyRepository = {
    findOne: jest.fn(),
  };

  const mockSLAViolationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockFieldServiceOrderRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockServiceContractRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockKnowledgeBaseRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceManagementService,
        { provide: getRepositoryToken(ServiceTicketEntity), useValue: mockTicketRepository },
        { provide: getRepositoryToken(TicketCategoryEntity), useValue: mockCategoryRepository },
        { provide: getRepositoryToken(SLAPolicyEntity), useValue: mockSLAPolicyRepository },
        { provide: getRepositoryToken(SLAViolationEntity), useValue: mockSLAViolationRepository },
        { provide: getRepositoryToken(FieldServiceOrderEntity), useValue: mockFieldServiceOrderRepository },
        { provide: getRepositoryToken(ServiceContractEntity), useValue: mockServiceContractRepository },
        { provide: getRepositoryToken(KnowledgeBaseArticleEntity), useValue: mockKnowledgeBaseRepository },
      ],
    }).compile();

    service = module.get<ServiceManagementService>(ServiceManagementService);
    ticketRepository = module.get<Repository<ServiceTicketEntity>>(getRepositoryToken(ServiceTicketEntity));
    categoryRepository = module.get<Repository<TicketCategoryEntity>>(getRepositoryToken(TicketCategoryEntity));
    slaPolicyRepository = module.get<Repository<SLAPolicyEntity>>(getRepositoryToken(SLAPolicyEntity));
    fieldServiceOrderRepository = module.get<Repository<FieldServiceOrderEntity>>(getRepositoryToken(FieldServiceOrderEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllTickets', () => {
    it('should return all tickets for a tenant', async () => {
      const tenantId = 'tenant-1';
      const tickets = [
        { id: '1', subject: 'Ticket 1', tenant_id: tenantId },
        { id: '2', subject: 'Ticket 2', tenant_id: tenantId },
      ];

      mockTicketRepository.find.mockResolvedValue(tickets);

      const result = await service.findAllTickets(tenantId);

      expect(result).toEqual(tickets);
      expect(mockTicketRepository.find).toHaveBeenCalledWith({
        where: { tenant_id: tenantId },
        relations: ['category'],
        order: { created_at: 'DESC' },
      });
    });

    it('should filter tickets by status', async () => {
      const tenantId = 'tenant-1';
      const status = TicketStatus.OPEN;
      const tickets = [{ id: '1', subject: 'Ticket 1', status, tenant_id: tenantId }];

      mockTicketRepository.find.mockResolvedValue(tickets);

      const result = await service.findAllTickets(tenantId, status);

      expect(result).toEqual(tickets);
      expect(mockTicketRepository.find).toHaveBeenCalledWith({
        where: { tenant_id: tenantId, status },
        relations: ['category'],
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findOneTicket', () => {
    it('should return a ticket by id', async () => {
      const tenantId = 'tenant-1';
      const ticketId = 'ticket-1';
      const ticket = { id: ticketId, subject: 'Ticket 1', tenant_id: tenantId };

      mockTicketRepository.findOne.mockResolvedValue(ticket);

      const result = await service.findOneTicket(ticketId, tenantId);

      expect(result).toEqual(ticket);
      expect(mockTicketRepository.findOne).toHaveBeenCalledWith({
        where: { id: ticketId, tenant_id: tenantId },
        relations: ['category'],
      });
    });

    it('should throw NotFoundException if ticket not found', async () => {
      const tenantId = 'tenant-1';
      const ticketId = 'non-existent';

      mockTicketRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneTicket(ticketId, tenantId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTicket', () => {
    it('should create a new ticket with SLA', async () => {
      const tenantId = 'tenant-1';
      const createDto = {
        subject: 'New Ticket',
        description: 'Description',
        category_id: 'cat-1',
        priority: TicketPriority.HIGH,
      };

      const category = { id: 'cat-1', default_sla_policy_id: 'sla-1', tenant_id: tenantId };
      const slaPolicy = { id: 'sla-1', resolution_time_minutes: 240, tenant_id: tenantId };
      const createdTicket = { id: '1', ticket_number: 'TKT-000001', ...createDto, tenant_id: tenantId };

      mockTicketRepository.count.mockResolvedValue(0);
      mockCategoryRepository.findOne.mockResolvedValue(category);
      mockSLAPolicyRepository.findOne.mockResolvedValue(slaPolicy);
      mockTicketRepository.create.mockReturnValue(createdTicket);
      mockTicketRepository.save.mockResolvedValue(createdTicket);

      const result = await service.createTicket(createDto, tenantId);

      expect(result.ticket_number).toBe('TKT-000001');
      expect(mockTicketRepository.save).toHaveBeenCalled();
    });
  });

  describe('assignTicket', () => {
    it('should assign a ticket to a user', async () => {
      const tenantId = 'tenant-1';
      const ticketId = 'ticket-1';
      const assignedTo = 'user-1';
      const ticket = { id: ticketId, status: TicketStatus.NEW, tenant_id: tenantId };

      mockTicketRepository.findOne.mockResolvedValue(ticket);
      mockTicketRepository.save.mockResolvedValue({ ...ticket, assigned_to: assignedTo, status: TicketStatus.OPEN });

      const result = await service.assignTicket(ticketId, assignedTo, tenantId);

      expect(result.assigned_to).toBe(assignedTo);
      expect(result.status).toBe(TicketStatus.OPEN);
    });
  });

  describe('resolveTicket', () => {
    it('should resolve a ticket', async () => {
      const tenantId = 'tenant-1';
      const ticketId = 'ticket-1';
      const resolutionNotes = 'Fixed the issue';
      const ticket = {
        id: ticketId,
        status: TicketStatus.IN_PROGRESS,
        created_at: new Date('2024-01-01T10:00:00'),
        tenant_id: tenantId,
      };

      mockTicketRepository.findOne.mockResolvedValue(ticket);
      mockTicketRepository.save.mockResolvedValue({
        ...ticket,
        status: TicketStatus.RESOLVED,
        resolution_notes: resolutionNotes,
        resolved_at: new Date(),
      });

      const result = await service.resolveTicket(ticketId, resolutionNotes, tenantId);

      expect(result.status).toBe(TicketStatus.RESOLVED);
      expect(result.resolution_notes).toBe(resolutionNotes);
    });
  });

  describe('closeTicket', () => {
    it('should close a resolved ticket', async () => {
      const tenantId = 'tenant-1';
      const ticketId = 'ticket-1';
      const ticket = { id: ticketId, status: TicketStatus.RESOLVED, tenant_id: tenantId };

      mockTicketRepository.findOne.mockResolvedValue(ticket);
      mockTicketRepository.save.mockResolvedValue({ ...ticket, status: TicketStatus.CLOSED, closed_at: new Date() });

      const result = await service.closeTicket(ticketId, tenantId);

      expect(result.status).toBe(TicketStatus.CLOSED);
    });

    it('should throw error if ticket is not resolved', async () => {
      const tenantId = 'tenant-1';
      const ticketId = 'ticket-1';
      const ticket = { id: ticketId, status: TicketStatus.OPEN, tenant_id: tenantId };

      mockTicketRepository.findOne.mockResolvedValue(ticket);

      await expect(service.closeTicket(ticketId, tenantId)).rejects.toThrow('Only resolved tickets can be closed');
    });
  });

  describe('rateTicket', () => {
    it('should rate a ticket', async () => {
      const tenantId = 'tenant-1';
      const ticketId = 'ticket-1';
      const rateDto = { satisfaction_rating: 5, satisfaction_feedback: 'Great service!' };
      const ticket = { id: ticketId, tenant_id: tenantId };

      mockTicketRepository.findOne.mockResolvedValue(ticket);
      mockTicketRepository.save.mockResolvedValue({ ...ticket, ...rateDto });

      const result = await service.rateTicket(ticketId, rateDto, tenantId);

      expect(result.satisfaction_rating).toBe(5);
      expect(result.satisfaction_feedback).toBe('Great service!');
    });
  });

  describe('findAllFieldServiceOrders', () => {
    it('should return all field service orders', async () => {
      const tenantId = 'tenant-1';
      const orders = [
        { id: '1', order_number: 'FSO-000001', tenant_id: tenantId },
        { id: '2', order_number: 'FSO-000002', tenant_id: tenantId },
      ];

      mockFieldServiceOrderRepository.find.mockResolvedValue(orders);

      const result = await service.findAllFieldServiceOrders(tenantId);

      expect(result).toEqual(orders);
      expect(mockFieldServiceOrderRepository.find).toHaveBeenCalled();
    });
  });

  describe('createFieldServiceOrder', () => {
    it('should create a new field service order', async () => {
      const tenantId = 'tenant-1';
      const createDto = {
        service_type: 'installation',
        customer_id: 'cust-1',
        assigned_technician: 'tech-1',
        scheduled_start: '2024-01-01T09:00:00',
        scheduled_end: '2024-01-01T12:00:00',
        service_address: '123 Main St',
      };

      const createdOrder = { id: '1', order_number: 'FSO-000001', ...createDto, tenant_id: tenantId };

      mockFieldServiceOrderRepository.count.mockResolvedValue(0);
      mockFieldServiceOrderRepository.create.mockReturnValue(createdOrder);
      mockFieldServiceOrderRepository.save.mockResolvedValue(createdOrder);

      const result = await service.createFieldServiceOrder(createDto as any, tenantId);

      expect(result.order_number).toBe('FSO-000001');
      expect(mockFieldServiceOrderRepository.save).toHaveBeenCalled();
    });
  });

  describe('searchKnowledgeBase', () => {
    it('should search knowledge base articles', async () => {
      const tenantId = 'tenant-1';
      const query = 'password reset';
      const articles = [{ id: '1', title: 'How to reset password', tenant_id: tenantId }];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(articles),
      };

      mockKnowledgeBaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.searchKnowledgeBase(query, tenantId);

      expect(result).toEqual(articles);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });
});
