import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerEntity } from './entities/customer.entity';
import { LeadEntity, LeadStatus } from './entities/lead.entity';
import { LeadActivityEntity } from './entities/lead-activity.entity';
import { OpportunityEntity, OpportunityStage } from './entities/opportunity.entity';
import { OpportunityProductEntity } from './entities/opportunity-product.entity';
import { ContactEntity } from './entities/contact.entity';
import { ActivityEntity } from './entities/activity.entity';
import { QuoteEntity, QuoteStatus } from './entities/quote.entity';
import { QuoteItemEntity } from './entities/quote-item.entity';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';
import type { CreateLeadDto, UpdateLeadDto, CreateLeadActivityDto } from './dto/create-lead.dto';
import type { CreateOpportunityDto, UpdateOpportunityDto } from './dto/create-opportunity.dto';
import type { CreateContactDto, UpdateContactDto } from './dto/create-contact.dto';
import type { CreateActivityDto, UpdateActivityDto } from './dto/create-activity.dto';
import type { CreateQuoteDto, UpdateQuoteDto } from './dto/create-quote.dto';

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(CustomerEntity)
    private customerRepo: Repository<CustomerEntity>,
    @InjectRepository(LeadEntity)
    private leadRepo: Repository<LeadEntity>,
    @InjectRepository(LeadActivityEntity)
    private leadActivityRepo: Repository<LeadActivityEntity>,
    @InjectRepository(OpportunityEntity)
    private opportunityRepo: Repository<OpportunityEntity>,
    @InjectRepository(OpportunityProductEntity)
    private opportunityProductRepo: Repository<OpportunityProductEntity>,
    @InjectRepository(ContactEntity)
    private contactRepo: Repository<ContactEntity>,
    @InjectRepository(ActivityEntity)
    private activityRepo: Repository<ActivityEntity>,
    @InjectRepository(QuoteEntity)
    private quoteRepo: Repository<QuoteEntity>,
    @InjectRepository(QuoteItemEntity)
    private quoteItemRepo: Repository<QuoteItemEntity>,
  ) { }

  // ==================== CUSTOMER METHODS ====================

  async findAllCustomers(tenantId: string): Promise<CustomerEntity[]> {
    return this.customerRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async findOneCustomer(id: string, tenantId: string): Promise<CustomerEntity> {
    const customer = await this.customerRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['contacts', 'opportunities', 'quotes'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async createCustomer(data: CreateCustomerDto, tenantId: string): Promise<CustomerEntity> {
    const existing = await this.customerRepo.findOne({
      where: [
        { email: data.email, tenant_id: tenantId },
        { customer_code: data.customer_code, tenant_id: tenantId },
      ],
    });

    if (existing) {
      throw new ConflictException('Customer with this email or code already exists');
    }

    const customer = this.customerRepo.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.customerRepo.save(customer);
  }

  async updateCustomer(id: string, data: UpdateCustomerDto, tenantId: string): Promise<CustomerEntity> {
    const customer = await this.findOneCustomer(id, tenantId);

    if (data.email && data.email !== customer.email) {
      const existing = await this.customerRepo.findOne({
        where: { email: data.email, tenant_id: tenantId },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Customer with this email already exists');
      }
    }

    Object.assign(customer, data);
    return this.customerRepo.save(customer);
  }

  async deleteCustomer(id: string, tenantId: string): Promise<void> {
    const customer = await this.findOneCustomer(id, tenantId);
    await this.customerRepo.remove(customer);
  }

  async searchCustomers(query: string, tenantId: string): Promise<CustomerEntity[]> {
    return this.customerRepo
      .createQueryBuilder('customer')
      .where('customer.tenant_id = :tenantId', { tenantId })
      .andWhere(
        '(customer.company_name ILIKE :query OR customer.email ILIKE :query OR customer.customer_code ILIKE :query)',
        { query: `%${query}%` },
      )
      .getMany();
  }

  // ==================== LEAD METHODS ====================

  async findAllLeads(tenantId: string): Promise<LeadEntity[]> {
    return this.leadRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async findOneLead(id: string, tenantId: string): Promise<LeadEntity> {
    const lead = await this.leadRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['activities'],
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async createLead(data: CreateLeadDto, tenantId: string): Promise<LeadEntity> {
    const existing = await this.leadRepo.findOne({
      where: [
        { email: data.email, tenant_id: tenantId },
        { lead_code: data.lead_code, tenant_id: tenantId },
      ],
    });

    if (existing) {
      throw new ConflictException('Lead with this email or code already exists');
    }

    const lead = this.leadRepo.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.leadRepo.save(lead);
  }

  async updateLead(id: string, data: UpdateLeadDto, tenantId: string): Promise<LeadEntity> {
    const lead = await this.findOneLead(id, tenantId);
    Object.assign(lead, data);
    return this.leadRepo.save(lead);
  }

  async deleteLead(id: string, tenantId: string): Promise<void> {
    const lead = await this.findOneLead(id, tenantId);
    await this.leadRepo.remove(lead);
  }

  async convertLeadToCustomer(leadId: string, tenantId: string): Promise<CustomerEntity> {
    const lead = await this.findOneLead(leadId, tenantId);

    if (lead.converted_customer_id) {
      throw new BadRequestException('Lead already converted');
    }

    const customerCode = `CUST-${Date.now()}`;
    const customer = await this.createCustomer(
      {
        customer_code: customerCode,
        company_name: lead.company_name,
        contact_person: lead.contact_person,
        email: lead.email,
        phone: lead.phone,
        mobile: lead.mobile,
        industry: lead.industry,
        website: lead.website,
      },
      tenantId,
    );

    lead.converted_customer_id = customer.id;
    lead.converted_at = new Date();
    lead.status = LeadStatus.WON;
    await this.leadRepo.save(lead);

    return customer;
  }

  async assignLead(leadId: string, userId: string, tenantId: string): Promise<LeadEntity> {
    const lead = await this.findOneLead(leadId, tenantId);
    lead.assigned_to = userId;
    return this.leadRepo.save(lead);
  }

  async addLeadActivity(data: CreateLeadActivityDto, tenantId: string): Promise<LeadActivityEntity> {
    await this.findOneLead(data.lead_id, tenantId);

    const activity = this.leadActivityRepo.create({
      ...data,
      activity_type: data.activity_type as any, // Cast to any to bypass string -> enum type mismatch temporarily, ideally handled in DTO
      tenant_id: tenantId,
    });

    return await this.leadActivityRepo.save(activity);
  }

  async getLeadActivities(leadId: string, tenantId: string): Promise<LeadActivityEntity[]> {
    return this.leadActivityRepo.find({
      where: { lead_id: leadId, tenant_id: tenantId },
      order: { date_time: 'DESC' },
    });
  }

  // ==================== OPPORTUNITY METHODS ====================

  async findAllOpportunities(tenantId: string): Promise<OpportunityEntity[]> {
    return this.opportunityRepo.find({
      where: { tenant_id: tenantId },
      relations: ['customer', 'products'],
      order: { created_at: 'DESC' },
    });
  }

  async findOneOpportunity(id: string, tenantId: string): Promise<OpportunityEntity> {
    const opportunity = await this.opportunityRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['customer', 'products'],
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    return opportunity;
  }

  async createOpportunity(data: CreateOpportunityDto, tenantId: string): Promise<OpportunityEntity> {
    const existing = await this.opportunityRepo.findOne({
      where: { opportunity_code: data.opportunity_code, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Opportunity with this code already exists');
    }

    const { products, ...opportunityData } = data;

    const opportunity = this.opportunityRepo.create({
      ...opportunityData,
      tenant_id: tenantId,
    });

    const savedOpportunity = await this.opportunityRepo.save(opportunity);

    if (products && products.length > 0) {
      const opportunityProducts = products.map((product) =>
        this.opportunityProductRepo.create({
          ...product,
          opportunity_id: savedOpportunity.id,
          tenant_id: tenantId,
        }),
      );

      await this.opportunityProductRepo.save(opportunityProducts);
    }

    return this.findOneOpportunity(savedOpportunity.id, tenantId);
  }

  async updateOpportunity(
    id: string,
    data: UpdateOpportunityDto,
    tenantId: string,
  ): Promise<OpportunityEntity> {
    const opportunity = await this.findOneOpportunity(id, tenantId);
    Object.assign(opportunity, data);
    return this.opportunityRepo.save(opportunity);
  }

  async deleteOpportunity(id: string, tenantId: string): Promise<void> {
    const opportunity = await this.findOneOpportunity(id, tenantId);
    await this.opportunityRepo.remove(opportunity);
  }

  async moveOpportunityStage(
    id: string,
    stage: OpportunityStage,
    tenantId: string,
  ): Promise<OpportunityEntity> {
    const opportunity = await this.findOneOpportunity(id, tenantId);
    opportunity.stage = stage;

    if (stage === OpportunityStage.CLOSED_WON || stage === OpportunityStage.CLOSED_LOST) {
      opportunity.actual_close_date = new Date();
    }

    return this.opportunityRepo.save(opportunity);
  }

  async getOpportunityForecast(tenantId: string): Promise<any> {
    const opportunities = await this.opportunityRepo.find({
      where: { tenant_id: tenantId },
    });

    const forecast = {
      total_pipeline_value: 0,
      weighted_value: 0,
      by_stage: {} as any,
    };

    opportunities.forEach((opp) => {
      if (opp.stage !== OpportunityStage.CLOSED_LOST && opp.stage !== OpportunityStage.CLOSED_WON) {
        forecast.total_pipeline_value += Number(opp.amount);
        forecast.weighted_value += Number(opp.amount) * (Number(opp.probability) / 100);

        if (!forecast.by_stage[opp.stage]) {
          forecast.by_stage[opp.stage] = {
            count: 0,
            total_value: 0,
          };
        }

        forecast.by_stage[opp.stage].count++;
        forecast.by_stage[opp.stage].total_value += Number(opp.amount);
      }
    });

    return forecast;
  }

  // ==================== CONTACT METHODS ====================

  async findAllContacts(customerId: string, tenantId: string): Promise<ContactEntity[]> {
    return this.contactRepo.find({
      where: { customer_id: customerId, tenant_id: tenantId },
      order: { is_primary: 'DESC', created_at: 'DESC' },
    });
  }

  async findOneContact(id: string, tenantId: string): Promise<ContactEntity> {
    const contact = await this.contactRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  async createContact(data: CreateContactDto, tenantId: string): Promise<ContactEntity> {
    await this.findOneCustomer(data.customer_id, tenantId);

    const contact = this.contactRepo.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.contactRepo.save(contact);
  }

  async updateContact(id: string, data: UpdateContactDto, tenantId: string): Promise<ContactEntity> {
    const contact = await this.findOneContact(id, tenantId);
    Object.assign(contact, data);
    return this.contactRepo.save(contact);
  }

  async deleteContact(id: string, tenantId: string): Promise<void> {
    const contact = await this.findOneContact(id, tenantId);
    await this.contactRepo.remove(contact);
  }

  // ==================== ACTIVITY METHODS ====================

  async findAllActivities(tenantId: string): Promise<ActivityEntity[]> {
    return this.activityRepo.find({
      where: { tenant_id: tenantId },
      order: { start_date_time: 'DESC' },
    });
  }

  async findOneActivity(id: string, tenantId: string): Promise<ActivityEntity> {
    const activity = await this.activityRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    return activity;
  }

  async createActivity(data: CreateActivityDto, tenantId: string): Promise<ActivityEntity> {
    const activity = this.activityRepo.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.activityRepo.save(activity);
  }

  async updateActivity(id: string, data: UpdateActivityDto, tenantId: string): Promise<ActivityEntity> {
    const activity = await this.findOneActivity(id, tenantId);
    Object.assign(activity, data);
    return this.activityRepo.save(activity);
  }

  async deleteActivity(id: string, tenantId: string): Promise<void> {
    const activity = await this.findOneActivity(id, tenantId);
    await this.activityRepo.remove(activity);
  }

  // ==================== QUOTE METHODS ====================

  async findAllQuotes(tenantId: string): Promise<QuoteEntity[]> {
    return this.quoteRepo.find({
      where: { tenant_id: tenantId },
      relations: ['customer', 'items'],
      order: { created_at: 'DESC' },
    });
  }

  async findOneQuote(id: string, tenantId: string): Promise<QuoteEntity> {
    const quote = await this.quoteRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['customer', 'items'],
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  async createQuote(data: CreateQuoteDto, tenantId: string): Promise<QuoteEntity> {
    const existing = await this.quoteRepo.findOne({
      where: { quote_number: data.quote_number, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Quote with this number already exists');
    }

    const { items, ...quoteData } = data;

    let subtotal = 0;
    let taxAmount = 0;

    items.forEach((item) => {
      subtotal += Number(item.total);
      taxAmount += Number(item.total) * (Number(item.tax_rate || 0) / 100);
    });

    const totalAmount = subtotal + taxAmount - Number(data.discount_amount || 0);

    const quote = this.quoteRepo.create({
      ...quoteData,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      tenant_id: tenantId,
    });

    const savedQuote = await this.quoteRepo.save(quote);

    if (items && items.length > 0) {
      const quoteItems = items.map((item) =>
        this.quoteItemRepo.create({
          ...item,
          quote_id: savedQuote.id,
          tenant_id: tenantId,
        }),
      );

      await this.quoteItemRepo.save(quoteItems);
    }

    return this.findOneQuote(savedQuote.id, tenantId);
  }

  async updateQuote(id: string, data: UpdateQuoteDto, tenantId: string): Promise<QuoteEntity> {
    const quote = await this.findOneQuote(id, tenantId);

    const { items, ...quoteData } = data;

    if (items) {
      await this.quoteItemRepo.delete({ quote_id: id, tenant_id: tenantId });

      let subtotal = 0;
      let taxAmount = 0;

      items.forEach((item) => {
        subtotal += Number(item.total);
        taxAmount += Number(item.total) * (Number(item.tax_rate || 0) / 100);
      });

      const totalAmount = subtotal + taxAmount - Number(data.discount_amount || quote.discount_amount || 0);

      quoteData['subtotal'] = subtotal;
      quoteData['tax_amount'] = taxAmount;
      quoteData['total_amount'] = totalAmount;

      const quoteItems = items.map((item) =>
        this.quoteItemRepo.create({
          ...item,
          quote_id: id,
          tenant_id: tenantId,
        }),
      );

      await this.quoteItemRepo.save(quoteItems);
    }

    Object.assign(quote, quoteData);
    return this.quoteRepo.save(quote);
  }

  async deleteQuote(id: string, tenantId: string): Promise<void> {
    const quote = await this.findOneQuote(id, tenantId);
    await this.quoteRepo.remove(quote);
  }

  async updateQuoteStatus(id: string, status: QuoteStatus, tenantId: string): Promise<QuoteEntity> {
    const quote = await this.findOneQuote(id, tenantId);
    quote.status = status;
    return this.quoteRepo.save(quote);
  }
}
