import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ReportPeriod } from './entities/financial-report.entity';

@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  getFinancialSummary(@CurrentTenant() tenantId: string) {
    return this.financeService.getFinancialSummary(tenantId);
  }

  @Get('reports/daily')
  getDailyReport(
    @CurrentTenant() tenantId: string,
    @Query('date') date: string,
  ) {
    return this.financeService.getDailyReport(tenantId, new Date(date));
  }

  @Get('reports/weekly')
  getWeeklyReport(
    @CurrentTenant() tenantId: string,
    @Query('date') date: string,
  ) {
    return this.financeService.getWeeklyReport(tenantId, new Date(date));
  }

  @Get('reports/monthly')
  getMonthlyReport(
    @CurrentTenant() tenantId: string,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.financeService.getMonthlyReport(tenantId, year, month);
  }

  @Get('reports/quarterly')
  getQuarterlyReport(
    @CurrentTenant() tenantId: string,
    @Query('year', ParseIntPipe) year: number,
    @Query('quarter', ParseIntPipe) quarter: number,
  ) {
    return this.financeService.getQuarterlyReport(tenantId, year, quarter);
  }

  @Get('reports/yearly')
  getYearlyReport(
    @CurrentTenant() tenantId: string,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.financeService.getYearlyReport(tenantId, year);
  }

  @Get('reports/custom')
  getCustomReport(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.financeService.getCustomReport(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('cash-flow')
  getCashFlow(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.financeService.getCashFlow(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
