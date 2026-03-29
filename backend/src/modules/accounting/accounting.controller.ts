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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { AccountingService } from './accounting.service';
import { SuggestionService } from './services/suggestion.service';
import { MatchingService } from './services/matching.service';
import { RuleEngineService } from './services/rule-engine.service';
import { DashboardService } from './services/dashboard.service';
import { RequireFeature } from '../subscriptions/decorators/require-feature.decorator';
import { RequireFeatureGuard } from '../subscriptions/guards/require-feature.guard';
import { PlanFeature } from '../subscriptions/subscription.constants';
import {
  CreateChartOfAccountDto,
  UpdateChartOfAccountDto,
} from './dto/create-chart-of-account.dto';
import {
  CreateJournalEntryDto,
  PostJournalEntryDto,
  ReverseJournalEntryDto,
} from './dto/create-journal-entry.dto';
import {
  CreateAccountReceivableDto,
  CreateAccountPayableDto,
  RecordPaymentDto,
  ReviewAccountReceivableDto,
  SignAccountReceivableDto,
} from './dto/create-ar-ap.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from './dto/create-bank-account.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../types/express';

@Controller('accounting')
@UseGuards(JwtAuthGuard, RequireFeatureGuard)
@RequireFeature(PlanFeature.ACCOUNTING)
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly suggestionService: SuggestionService,
    private readonly matchingService: MatchingService,
    private readonly ruleEngineService: RuleEngineService,
    private readonly dashboardService: DashboardService,
  ) { }

  // ==================== CHART OF ACCOUNTS ENDPOINTS ====================

  @Post('accounts')
  async createAccount(
    @Body() data: CreateChartOfAccountDto,
    @CurrentTenant() tenantId: string,
  ) {
    try {
      return await this.accountingService.createAccount(data, tenantId);
    } catch (e) {
      console.error("ACCOUNT CREATION ERROR:", e);
      throw e;
    }
  }

  @Get('accounts')
  getAccounts(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.accountingService.getAccounts(
      tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 200,
    );
  }

  @Get('accounts/:id')
  getAccount(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.accountingService.getAccount(id, tenantId);
  }

  @Put('accounts/:id')
  updateAccount(
    @Param('id') id: string,
    @Body() data: UpdateChartOfAccountDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accountingService.updateAccount(id, data, tenantId);
  }

  @Delete('accounts/:id')
  deleteAccount(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.accountingService.deleteAccount(id, tenantId);
  }

  // ==================== JOURNAL ENTRY ENDPOINTS ====================

  @Post('journal-entries')
  createJournalEntry(
    @Body() data: CreateJournalEntryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accountingService.createJournalEntry(data, tenantId);
  }

  @Get('journal-entries')
  getJournalEntries(@CurrentTenant() tenantId: string) {
    return this.accountingService.getJournalEntries(tenantId);
  }

  @Get('journal-entries/:id')
  getJournalEntry(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accountingService.getJournalEntry(id, tenantId);
  }

  @Post('journal-entries/:id/post')
  postJournalEntry(
    @Param('id') id: string,
    @Body() data: PostJournalEntryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accountingService.postJournalEntry(id, data, tenantId);
  }

  @Post('journal-entries/:id/reverse')
  reverseJournalEntry(
    @Param('id') id: string,
    @Body() data: ReverseJournalEntryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accountingService.reverseJournalEntry(id, data, tenantId);
  }

  // ==================== ACCOUNTS RECEIVABLE ENDPOINTS ====================

  @Post('accounts-receivable')
  createAR(
    @Body() data: CreateAccountReceivableDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accountingService.createAR(data, tenantId);
  }

  @Get('accounts-receivable')
  getARList(@CurrentTenant() tenantId: string) {
    return this.accountingService.getARList(tenantId);
  }

  @Get('accounts-receivable/:id')
  getAR(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.accountingService.getAR(id, tenantId);
  }

  @Post('accounts-receivable/:id/submit')
  submitAR(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accountingService.submitAR(id, tenantId);
  }

  @Post('accounts-receivable/:id/approve')
  approveAR(
    @Param('id') id: string,
    @Body() data: ReviewAccountReceivableDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.accountingService.approveAR(id, data, tenantId, user.sub);
  }

  @Post('accounts-receivable/:id/reject')
  rejectAR(
    @Param('id') id: string,
    @Body() data: ReviewAccountReceivableDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.accountingService.rejectAR(id, data, tenantId, user.sub);
  }

  @Post('accounts-receivable/:id/post')
  postAR(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.accountingService.postAR(id, tenantId, user.sub);
  }

  @Post('accounts-receivable/:id/sign')
  signAR(
    @Param('id') id: string,
    @Body() data: SignAccountReceivableDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accountingService.signAR(id, data, tenantId);
  }

  @Post('accounts-receivable/:id/payment')
  recordARPayment(
    @Param('id') id: string,
    @Body() data: RecordPaymentDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accountingService.recordARPayment(id, data, tenantId);
  }

  // ==================== ACCOUNTS PAYABLE ENDPOINTS ====================

  @Post('accounts-payable')
  createAP(
    @Body() data: CreateAccountPayableDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accountingService.createAP(data, tenantId);
  }

  @Get('accounts-payable')
  getAPList(@CurrentTenant() tenantId: string) {
    return this.accountingService.getAPList(tenantId);
  }

  @Get('accounts-payable/:id')
  getAP(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.accountingService.getAP(id, tenantId);
  }

  @Post('accounts-payable/:id/payment')
  recordAPPayment(
    @Param('id') id: string,
    @Body() data: RecordPaymentDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accountingService.recordAPPayment(id, data, tenantId);
  }

  // ==================== PAYMENT ENDPOINTS ====================

  @Post('payments')
  createPayment(
    @Body() data: CreatePaymentDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accountingService.createPayment(data, tenantId);
  }

  @Get('payments')
  getPayments(@CurrentTenant() tenantId: string) {
    return this.accountingService.getPayments(tenantId);
  }

  @Get('payments/:id')
  getPayment(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.accountingService.getPayment(id, tenantId);
  }

  // ==================== BANK ACCOUNT ENDPOINTS ====================

  @Post('bank-accounts')
  createBankAccount(
    @Body() data: CreateBankAccountDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accountingService.createBankAccount(data, tenantId);
  }

  @Get('bank-accounts')
  getBankAccounts(@CurrentTenant() tenantId: string) {
    return this.accountingService.getBankAccounts(tenantId);
  }

  @Get('bank-accounts/:id')
  getBankAccount(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.accountingService.getBankAccount(id, tenantId);
  }

  @Put('bank-accounts/:id')
  updateBankAccount(
    @Param('id') id: string,
    @Body() data: UpdateBankAccountDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.accountingService.updateBankAccount(id, data, tenantId);
  }

  // ==================== REPORTING ENDPOINTS ====================

  @Get('reports/trial-balance')
  getTrialBalance(
    @CurrentTenant() tenantId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.accountingService.getTrialBalance(
      tenantId,
      startDate,
      endDate,
    );
  }

  @Get('reports/balance-sheet')
  getBalanceSheet(
    @CurrentTenant() tenantId: string,
    @Query('as_of_date') asOfDate?: string,
  ) {
    return this.accountingService.getBalanceSheet(tenantId, asOfDate);
  }

  @Get('reports/profit-and-loss')
  getProfitAndLoss(
    @CurrentTenant() tenantId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    return this.accountingService.getProfitAndLoss(
      tenantId,
      startDate,
      endDate,
    );
  }

  // ==================== INTELLIGENCE ENDPOINTS ====================

  @Get('intelligence/suggestions')
  getSuggestions(@CurrentTenant() tenantId: string) {
    return this.suggestionService.generateSuggestions(tenantId);
  }

  @Get('intelligence/insights')
  getInsights(@CurrentTenant() tenantId: string) {
    return this.suggestionService.getFinancialInsights(tenantId);
  }

  @Get('intelligence/rules')
  runRules(@CurrentTenant() tenantId: string) {
    return this.ruleEngineService.runAllRules(tenantId);
  }

  @Get('intelligence/reconcile')
  reconcile(@CurrentTenant() tenantId: string) {
    return this.matchingService.reconcileBankTransactions(tenantId);
  }

  @Get('intelligence/duplicate-payments')
  detectDuplicates(@CurrentTenant() tenantId: string) {
    return this.matchingService.detectDuplicatePayments(tenantId);
  }

  @Get('intelligence/dashboard')
  getSmartDashboard(@CurrentTenant() tenantId: string) {
    return this.dashboardService.getSmartDashboard(tenantId);
  }

  @Post('intelligence/match-payment')
  matchPayment(
    @Body() body: { amount: number; customer_id?: string; date?: string },
    @CurrentTenant() tenantId: string,
  ) {
    return this.matchingService.matchPaymentToInvoices(
      tenantId,
      body.amount,
      body.customer_id,
      body.date,
    );
  }
}
