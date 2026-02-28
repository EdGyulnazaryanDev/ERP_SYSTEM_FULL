import { Test, TestingModule } from '@nestjs/testing';
import { CrmService } from './crm.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CustomerEntity, CustomerType, CustomerStatus } from './entities/customer.entity';
import { LeadEntity, LeadSource, LeadStatus } from './entities/lead.entity';
import { LeadActivityEntity } from './entities/lead-activity.entity';
import { OpportunityEntity, OpportunityStage } from './entities/opportunity.entity';
import { OpportunityProductEntity } from './entities/opportunity-product.entity';
import { ContactEntity } from './entities/contact.entity';
import { ActivityEntity } from './entities/activity.entity';
import { QuoteEntity, QuoteStatus } from './entities/quote.entity';
import { QuoteItemEntity } from './entities/quote-item.entity';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('CrmService', () => {
  let service: CrmService;
  let customerRepo: jest.Mocked<Repository<CustomerEntity>>;
  let leadRepo: jest.Mocked<Repository<LeadEntity>>;
  let leadActivityRepo: jest.Mocked<Repository<LeadActivityEntity>>;
  let opportunityRepo: jest.Mocked<Repository<OpportunityEntity>>;
  let opportunityProductRepo: jest.Mocked<Repository<OpportunityProductEntity>>;
  let contactRepo: jest.Mocked<Repository<ContactEntity>>;
  let activityRepo: jest.Mocked<Repository<ActivityEntity>>;
  let quoteRepo: jest.Mocked<Repository<QuoteEntity>>;
  let quoteItemRepo: jest.Mocked<Repository<QuoteItemEntity>>;

  const mockCustomer: CustomerEntity = {
    id: 'cust-1',
    tenant_id: 'tenant-1',
    customer_code: 'CUST001',
    company_name: 'Acme Corp',
    contact_person: 'John Doe',
    email: 'john@acme.com',
    phone: '1234567890',
    mobile: null,
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    postal_code: '10001',
    country: 'USA',
    customer_type: CustomerType.BUSINESS,
    industry: 'Technology',
    website: 'https://acme.com',
    tax_id: 'TAX123',
    credit_limit: 50000,
    payment_terms: 30,
    status: CustomerStatus.ACTIVE,
    tags: ['vip', 'tech'],
    notes: null,
    assigned_to: null,
    contacts: [],
    opportunities: [],
    quotes: [],
    activities: [],
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrmService,
        {
          provide: getRepositoryToken(CustomerEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LeadEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LeadActivityEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OpportunityEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OpportunityProductEntity),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ContactEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ActivityEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(QuoteEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(QuoteItemEntity),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CrmService>(CrmService);
    customerRepo = module.get(getRepositoryToken(CustomerEntity));
    leadRepo = module.get(getRepositoryToken(LeadEntity));
    leadActivityRepo = module.get(getRepositoryToken(LeadActivityEntity));
    opportunityRepo = module.get(getRepositoryToken(OpportunityEntity));
    opportunityProductRepo = module.get(getRepositoryToken(OpportunityProductEntity));
    contactRepo = module.get(getRepositoryToken(ContactEntity));
    activityRepo = module.get(getRepositoryToken(ActivityEntity));
    quoteRepo = module.get(getRepositoryToken(QuoteEntity));
    quoteItemRepo = module.get(getRepositoryToken(QuoteItemEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== CUSTOMER TESTS ====================

  describe('findAllCustomers', () => {
    it('should return all customers for tenant', async () => {
      const customers = [mockCustomer];
      customerRepo.find.mockResolvedValue(customers);

      const result = await service.findAllCustomers('tenant-1');

      expect(result).toEqual(customers);
      expect(customerRepo.find).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-1' },
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findOneCustomer', () => {
    it('should return customer by id', async () => {
      customerRepo.findOne.mockResolvedValue(mockCustomer);

      const result = await service.findOneCustomer('cust-1', 'tenant-1');

      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException if customer not found', async () => {
      customerRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneCustomer('cust-999', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createCustomer', () => {
    it('should create customer successfully', async () => {
      const createDto = {
        customer_code: 'CUST002',
        company_name: 'Tech Inc',
        email: 'info@tech.com',
      };

      customerRepo.findOne.mockResolvedValue(null);
      customerRepo.create.mockReturnValue({ ...mockCustomer, ...createDto } as any);
      customerRepo.save.mockResolvedValue({ ...mockCustomer, ...createDto } as any);

      const result = await service.createCustomer(createDto as any, 'tenant-1');

      expect(result).toHaveProperty('id');
      expect(customerRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if customer email exists', async () => {
      const createDto = {
        customer_code: 'CUST002',
        email: 'john@acme.com',
      };

      customerRepo.findOne.mockResolvedValue(mockCustomer);

      await expect(service.createCustomer(createDto as any, 'tenant-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateCustomer', () => {
    it('should update customer successfully', async () => {
      const updateDto = { company_name: 'Acme Corporation' };
      const updated = { ...mockCustomer, ...updateDto };

      customerRepo.findOne.mockResolvedValue(mockCustomer);
      customerRepo.save.mockResolvedValue(updated);

      const result = await service.updateCustomer('cust-1', updateDto as any, 'tenant-1');

      expect(result.company_name).toBe('Acme Corporation');
    });
  });

  describe('deleteCustomer', () => {
    it('should delete customer successfully', async () => {
      customerRepo.findOne.mockResolvedValue(mockCustomer);
      customerRepo.remove.mockResolvedValue(mockCustomer);

      await service.deleteCustomer('cust-1', 'tenant-1');

      expect(customerRepo.remove).toHaveBeenCalled();
    });
  });

  // ==================== LEAD TESTS ====================

  describe('createLead', () => {
    it('should create lead successfully', async () => {
      const createDto = {
        lead_code: 'LEAD001',
        company_name: 'Prospect Corp',
        contact_person: 'Jane Smith',
        email: 'jane@prospect.com',
        source: LeadSource.WEBSITE,
      };

      const mockLead = {
        id: 'lead-1',
        tenant_id: 'tenant-1',
        ...createDto,
        status: LeadStatus.NEW,
        score: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      leadRepo.findOne.mockResolvedValue(null);
      leadRepo.create.mockReturnValue(mockLead as any);
      leadRepo.save.mockResolvedValue(mockLead as any);

      const result = await service.createLead(createDto as any, 'tenant-1');

      expect(result).toHaveProperty('id');
      expect(leadRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if lead email exists', async () => {
      const createDto = {
        lead_code: 'LEAD001',
        email: 'existing@email.com',
      };

      leadRepo.findOne.mockResolvedValue({ id: 'lead-1' } as any);

      await expect(service.createLead(createDto as any, 'tenant-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('convertLeadToCustomer', () => {
    it('should convert lead to customer successfully', async () => {
      const mockLead = {
        id: 'lead-1',
        tenant_id: 'tenant-1',
        lead_code: 'LEAD001',
        company_name: 'Prospect Corp',
        contact_person: 'Jane Smith',
        email: 'jane@prospect.com',
        phone: '1234567890',
        mobile: null,
        industry: 'Tech',
        website: 'https://prospect.com',
        converted_customer_id: null,
        status: LeadStatus.QUALIFIED,
        activities: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      leadRepo.findOne.mockResolvedValue(mockLead as any);
      customerRepo.findOne.mockResolvedValue(null);
      customerRepo.create.mockReturnValue(mockCustomer);
      customerRepo.save.mockResolvedValue(mockCustomer);
      leadRepo.save.mockResolvedValue({ ...mockLead, converted_customer_id: 'cust-1' } as any);

      const result = await service.convertLeadToCustomer('lead-1', 'tenant-1');

      expect(result).toHaveProperty('id');
      expect(leadRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if lead already converted', async () => {
      const mockLead = {
        id: 'lead-1',
        converted_customer_id: 'cust-1',
      };

      leadRepo.findOne.mockResolvedValue(mockLead as any);

      await expect(service.convertLeadToCustomer('lead-1', 'tenant-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== OPPORTUNITY TESTS ====================

  describe('createOpportunity', () => {
    it('should create opportunity successfully', async () => {
      const createDto = {
        opportunity_code: 'OPP001',
        customer_id: 'cust-1',
        name: 'Big Deal',
        amount: 100000,
        stage: OpportunityStage.PROSPECTING,
        products: [],
      };

      const mockOpportunity = {
        id: 'opp-1',
        tenant_id: 'tenant-1',
        ...createDto,
        customer: mockCustomer,
        products: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      opportunityRepo.findOne.mockResolvedValueOnce(null);
      opportunityRepo.create.mockReturnValue(mockOpportunity as any);
      opportunityRepo.save.mockResolvedValue(mockOpportunity as any);
      opportunityRepo.findOne.mockResolvedValueOnce(mockOpportunity as any);

      const result = await service.createOpportunity(createDto as any, 'tenant-1');

      expect(result).toHaveProperty('id');
      expect(opportunityRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if opportunity code exists', async () => {
      const createDto = {
        opportunity_code: 'OPP001',
      };

      opportunityRepo.findOne.mockResolvedValue({ id: 'opp-1' } as any);

      await expect(service.createOpportunity(createDto as any, 'tenant-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('moveOpportunityStage', () => {
    it('should move opportunity to new stage', async () => {
      const mockOpportunity = {
        id: 'opp-1',
        tenant_id: 'tenant-1',
        stage: OpportunityStage.PROSPECTING,
        customer: mockCustomer,
        products: [],
      };

      opportunityRepo.findOne.mockResolvedValue(mockOpportunity as any);
      opportunityRepo.save.mockResolvedValue({
        ...mockOpportunity,
        stage: OpportunityStage.QUALIFICATION,
      } as any);

      const result = await service.moveOpportunityStage(
        'opp-1',
        OpportunityStage.QUALIFICATION,
        'tenant-1',
      );

      expect(result.stage).toBe(OpportunityStage.QUALIFICATION);
      expect(opportunityRepo.save).toHaveBeenCalled();
    });
  });

  describe('getOpportunityForecast', () => {
    it('should calculate opportunity forecast', async () => {
      const opportunities = [
        {
          id: 'opp-1',
          stage: OpportunityStage.PROSPECTING,
          amount: 100000,
          probability: 20,
        },
        {
          id: 'opp-2',
          stage: OpportunityStage.PROPOSAL,
          amount: 50000,
          probability: 50,
        },
      ];

      opportunityRepo.find.mockResolvedValue(opportunities as any);

      const result = await service.getOpportunityForecast('tenant-1');

      expect(result).toHaveProperty('total_pipeline_value');
      expect(result).toHaveProperty('weighted_value');
      expect(result).toHaveProperty('by_stage');
      expect(result.total_pipeline_value).toBe(150000);
    });
  });

  // ==================== CONTACT TESTS ====================

  describe('createContact', () => {
    it('should create contact successfully', async () => {
      const createDto = {
        customer_id: 'cust-1',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane.doe@acme.com',
        is_primary: true,
      };

      const mockContact = {
        id: 'contact-1',
        tenant_id: 'tenant-1',
        ...createDto,
        created_at: new Date(),
        updated_at: new Date(),
      };

      customerRepo.findOne.mockResolvedValue(mockCustomer);
      contactRepo.create.mockReturnValue(mockContact as any);
      contactRepo.save.mockResolvedValue(mockContact as any);

      const result = await service.createContact(createDto as any, 'tenant-1');

      expect(result).toHaveProperty('id');
      expect(contactRepo.save).toHaveBeenCalled();
    });
  });

  // ==================== QUOTE TESTS ====================

  describe('createQuote', () => {
    it('should create quote with items successfully', async () => {
      const createDto = {
        quote_number: 'QUO001',
        customer_id: 'cust-1',
        quote_date: '2024-03-01',
        valid_until: '2024-03-31',
        tax_rate: 10,
        discount_amount: 0,
        items: [
          {
            description: 'Product A',
            quantity: 2,
            unit_price: 1000,
            total: 2000,
            tax_rate: 10,
          },
        ],
      };

      const mockQuote = {
        id: 'quote-1',
        tenant_id: 'tenant-1',
        ...createDto,
        subtotal: 2000,
        tax_amount: 200,
        total_amount: 2200,
        status: QuoteStatus.DRAFT,
        customer: mockCustomer,
        items: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      quoteRepo.findOne.mockResolvedValueOnce(null);
      quoteRepo.create.mockReturnValue(mockQuote as any);
      quoteRepo.save.mockResolvedValue(mockQuote as any);
      quoteItemRepo.create.mockReturnValue({} as any);
      quoteItemRepo.save.mockResolvedValue([]);
      quoteRepo.findOne.mockResolvedValueOnce(mockQuote as any);

      const result = await service.createQuote(createDto as any, 'tenant-1');

      expect(result).toHaveProperty('id');
      expect(quoteRepo.save).toHaveBeenCalled();
      expect(quoteItemRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if quote number exists', async () => {
      const createDto = {
        quote_number: 'QUO001',
        items: [],
      };

      quoteRepo.findOne.mockResolvedValue({ id: 'quote-1' } as any);

      await expect(service.createQuote(createDto as any, 'tenant-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateQuoteStatus', () => {
    it('should update quote status successfully', async () => {
      const mockQuote = {
        id: 'quote-1',
        tenant_id: 'tenant-1',
        status: QuoteStatus.DRAFT,
        customer: mockCustomer,
        items: [],
      };

      quoteRepo.findOne.mockResolvedValue(mockQuote as any);
      quoteRepo.save.mockResolvedValue({ ...mockQuote, status: QuoteStatus.SENT } as any);

      const result = await service.updateQuoteStatus('quote-1', QuoteStatus.SENT, 'tenant-1');

      expect(result.status).toBe(QuoteStatus.SENT);
      expect(quoteRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if quote not found', async () => {
      quoteRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateQuoteStatus('quote-999', QuoteStatus.SENT, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
