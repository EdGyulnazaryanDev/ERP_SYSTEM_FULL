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
} from '@nestjs/common';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateLeadDto, UpdateLeadDto, CreateLeadActivityDto } from './dto/create-lead.dto';
import { CreateOpportunityDto, UpdateOpportunityDto } from './dto/create-opportunity.dto';
import { CreateContactDto, UpdateContactDto } from './dto/create-contact.dto';
import { CreateActivityDto, UpdateActivityDto } from './dto/create-activity.dto';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/create-quote.dto';
import { OpportunityStage } from './entities/opportunity.entity';
import { QuoteStatus } from './entities/quote.entity';

@UseGuards(JwtAuthGuard)
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  // ==================== CUSTOMER ENDPOINTS ====================

  @Get('customers')
  findAllCustomers(@CurrentTenant() tenantId: string) {
    return this.crmService.findAllCustomers(tenantId);
  }

  @Get('customers/search')
  searchCustomers(@Query('q') query: string, @CurrentTenant() tenantId: string) {
    return this.crmService.searchCustomers(query, tenantId);
  }

  @Get('customers/:id')
  findOneCustomer(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.crmService.findOneCustomer(id, tenantId);
  }

  @Post('customers')
  createCustomer(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.crmService.createCustomer(createCustomerDto, tenantId);
  }

  @Put('customers/:id')
  updateCustomer(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.crmService.updateCustomer(id, updateCustomerDto, tenantId);
  }

  @Delete('customers/:id')
  async deleteCustomer(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.crmService.deleteCustomer(id, tenantId);
    return { message: 'Customer deleted successfully' };
  }

  // ==================== LEAD ENDPOINTS ====================

  @Get('leads')
  findAllLeads(@CurrentTenant() tenantId: string) {
    return this.crmService.findAllLeads(tenantId);
  }

  @Get('leads/:id')
  findOneLead(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.crmService.findOneLead(id, tenantId);
  }

  @Post('leads')
  createLead(@Body() createLeadDto: CreateLeadDto, @CurrentTenant() tenantId: string) {
    return this.crmService.createLead(createLeadDto, tenantId);
  }

  @Put('leads/:id')
  updateLead(
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.crmService.updateLead(id, updateLeadDto, tenantId);
  }

  @Delete('leads/:id')
  async deleteLead(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.crmService.deleteLead(id, tenantId);
    return { message: 'Lead deleted successfully' };
  }

  @Post('leads/:id/convert')
  convertLeadToCustomer(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.crmService.convertLeadToCustomer(id, tenantId);
  }

  @Post('leads/:id/assign')
  assignLead(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.crmService.assignLead(id, userId, tenantId);
  }

  @Post('leads/activities')
  addLeadActivity(
    @Body() createLeadActivityDto: CreateLeadActivityDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.crmService.addLeadActivity(createLeadActivityDto, tenantId);
  }

  @Get('leads/:id/activities')
  getLeadActivities(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.crmService.getLeadActivities(id, tenantId);
  }

  // ==================== OPPORTUNITY ENDPOINTS ====================

  @Get('opportunities')
  findAllOpportunities(@CurrentTenant() tenantId: string) {
    return this.crmService.findAllOpportunities(tenantId);
  }

  @Get('opportunities/forecast')
  getOpportunityForecast(@CurrentTenant() tenantId: string) {
    return this.crmService.getOpportunityForecast(tenantId);
  }

  @Get('opportunities/:id')
  findOneOpportunity(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.crmService.findOneOpportunity(id, tenantId);
  }

  @Post('opportunities')
  createOpportunity(
    @Body() createOpportunityDto: CreateOpportunityDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.crmService.createOpportunity(createOpportunityDto, tenantId);
  }

  @Put('opportunities/:id')
  updateOpportunity(
    @Param('id') id: string,
    @Body() updateOpportunityDto: UpdateOpportunityDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.crmService.updateOpportunity(id, updateOpportunityDto, tenantId);
  }

  @Delete('opportunities/:id')
  async deleteOpportunity(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.crmService.deleteOpportunity(id, tenantId);
    return { message: 'Opportunity deleted successfully' };
  }

  @Post('opportunities/:id/move-stage')
  moveOpportunityStage(
    @Param('id') id: string,
    @Body('stage') stage: OpportunityStage,
    @CurrentTenant() tenantId: string,
  ) {
    return this.crmService.moveOpportunityStage(id, stage, tenantId);
  }

  // ==================== CONTACT ENDPOINTS ====================

  @Get('contacts/customer/:customerId')
  findAllContacts(
    @Param('customerId') customerId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.crmService.findAllContacts(customerId, tenantId);
  }

  @Get('contacts/:id')
  findOneContact(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.crmService.findOneContact(id, tenantId);
  }

  @Post('contacts')
  createContact(
    @Body() createContactDto: CreateContactDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.crmService.createContact(createContactDto, tenantId);
  }

  @Put('contacts/:id')
  updateContact(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.crmService.updateContact(id, updateContactDto, tenantId);
  }

  @Delete('contacts/:id')
  async deleteContact(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.crmService.deleteContact(id, tenantId);
    return { message: 'Contact deleted successfully' };
  }

  // ==================== ACTIVITY ENDPOINTS ====================

  @Get('activities')
  findAllActivities(@CurrentTenant() tenantId: string) {
    return this.crmService.findAllActivities(tenantId);
  }

  @Get('activities/:id')
  findOneActivity(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.crmService.findOneActivity(id, tenantId);
  }

  @Post('activities')
  createActivity(
    @Body() createActivityDto: CreateActivityDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.crmService.createActivity(createActivityDto, tenantId);
  }

  @Put('activities/:id')
  updateActivity(
    @Param('id') id: string,
    @Body() updateActivityDto: UpdateActivityDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.crmService.updateActivity(id, updateActivityDto, tenantId);
  }

  @Delete('activities/:id')
  async deleteActivity(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.crmService.deleteActivity(id, tenantId);
    return { message: 'Activity deleted successfully' };
  }

  // ==================== QUOTE ENDPOINTS ====================

  @Get('quotes')
  findAllQuotes(@CurrentTenant() tenantId: string) {
    return this.crmService.findAllQuotes(tenantId);
  }

  @Get('quotes/:id')
  findOneQuote(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.crmService.findOneQuote(id, tenantId);
  }

  @Post('quotes')
  createQuote(@Body() createQuoteDto: CreateQuoteDto, @CurrentTenant() tenantId: string) {
    return this.crmService.createQuote(createQuoteDto, tenantId);
  }

  @Put('quotes/:id')
  updateQuote(
    @Param('id') id: string,
    @Body() updateQuoteDto: UpdateQuoteDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.crmService.updateQuote(id, updateQuoteDto, tenantId);
  }

  @Delete('quotes/:id')
  async deleteQuote(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.crmService.deleteQuote(id, tenantId);
    return { message: 'Quote deleted successfully' };
  }

  @Put('quotes/:id/status')
  updateQuoteStatus(
    @Param('id') id: string,
    @Body('status') status: QuoteStatus,
    @CurrentTenant() tenantId: string,
  ) {
    return this.crmService.updateQuoteStatus(id, status, tenantId);
  }
}
