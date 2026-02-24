import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { FinancialReportEntity, ReportPeriod } from './entities/financial-report.entity';
import { TransactionEntity, TransactionType, TransactionStatus } from '../transactions/entities/transaction.entity';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(FinancialReportEntity)
    private reportRepo: Repository<FinancialReportEntity>,
    @InjectRepository(TransactionEntity)
    private transactionRepo: Repository<TransactionEntity>,
  ) {}

  async generateReport(
    tenantId: string,
    period: ReportPeriod,
    startDate: Date,
    endDate: Date,
  ): Promise<FinancialReportEntity> {
    const transactions = await this.transactionRepo.find({
      where: {
        tenant_id: tenantId,
        status: TransactionStatus.COMPLETED,
        transaction_date: Between(startDate, endDate),
      },
      relations: ['items'],
    });

    let totalIncome = 0;
    let totalOutcome = 0;
    let costOfGoodsSold = 0;
    let operatingExpenses = 0;
    let salesCount = 0;
    let purchaseCount = 0;

    const incomeByCategory: Record<string, number> = {};
    const outcomeByCategory: Record<string, number> = {};
    const dailyIncome: Record<string, number> = {};
    const dailyOutcome: Record<string, number> = {};

    transactions.forEach((transaction) => {
      const amount = Number(transaction.total_amount);
      const dateKey = transaction.transaction_date.toISOString().split('T')[0];

      if (transaction.type === TransactionType.SALE) {
        totalIncome += amount;
        salesCount++;
        incomeByCategory['Sales'] = (incomeByCategory['Sales'] || 0) + amount;
        dailyIncome[dateKey] = (dailyIncome[dateKey] || 0) + amount;

        // Calculate COGS from items
        transaction.items.forEach((item) => {
          // Assuming unit_cost is available or use 60% of price as estimate
          const itemCost = Number(item.unit_price) * 0.6 * item.quantity;
          costOfGoodsSold += itemCost;
        });
      } else if (transaction.type === TransactionType.PURCHASE) {
        totalOutcome += amount;
        purchaseCount++;
        outcomeByCategory['Purchases'] = (outcomeByCategory['Purchases'] || 0) + amount;
        dailyOutcome[dateKey] = (dailyOutcome[dateKey] || 0) + amount;
      } else if (transaction.type === TransactionType.RETURN) {
        // Returns reduce income
        totalIncome -= amount;
        incomeByCategory['Returns'] = (incomeByCategory['Returns'] || 0) - amount;
      }

      // Operating expenses (shipping, etc.)
      if (transaction.shipping_amount > 0) {
        operatingExpenses += Number(transaction.shipping_amount);
      }
    });

    const grossProfit = totalIncome - costOfGoodsSold;
    const netProfit = grossProfit - operatingExpenses - totalOutcome;

    const breakdown = {
      incomeByCategory,
      outcomeByCategory,
      dailyIncome: Object.entries(dailyIncome).map(([date, amount]) => ({
        date,
        amount,
      })),
      dailyOutcome: Object.entries(dailyOutcome).map(([date, amount]) => ({
        date,
        amount,
      })),
      profitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0,
      averageTransactionValue:
        transactions.length > 0 ? totalIncome / salesCount : 0,
    };

    const report = this.reportRepo.create({
      tenant_id: tenantId,
      period,
      start_date: startDate,
      end_date: endDate,
      total_income: totalIncome,
      total_outcome: totalOutcome,
      net_profit: netProfit,
      gross_profit: grossProfit,
      operating_expenses: operatingExpenses,
      cost_of_goods_sold: costOfGoodsSold,
      transaction_count: transactions.length,
      sales_count: salesCount,
      purchase_count: purchaseCount,
      breakdown,
    });

    return this.reportRepo.save(report);
  }

  async getDailyReport(tenantId: string, date: Date): Promise<any> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    return this.generateReport(
      tenantId,
      ReportPeriod.DAILY,
      startDate,
      endDate,
    );
  }

  async getWeeklyReport(tenantId: string, date: Date): Promise<any> {
    const startDate = new Date(date);
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    return this.generateReport(
      tenantId,
      ReportPeriod.WEEKLY,
      startDate,
      endDate,
    );
  }

  async getMonthlyReport(tenantId: string, year: number, month: number): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    return this.generateReport(
      tenantId,
      ReportPeriod.MONTHLY,
      startDate,
      endDate,
    );
  }

  async getQuarterlyReport(tenantId: string, year: number, quarter: number): Promise<any> {
    const startMonth = (quarter - 1) * 3;
    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);

    return this.generateReport(
      tenantId,
      ReportPeriod.QUARTERLY,
      startDate,
      endDate,
    );
  }

  async getYearlyReport(tenantId: string, year: number): Promise<any> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    return this.generateReport(
      tenantId,
      ReportPeriod.YEARLY,
      startDate,
      endDate,
    );
  }

  async getCustomReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    return this.generateReport(
      tenantId,
      ReportPeriod.CUSTOM,
      startDate,
      endDate,
    );
  }

  async getCashFlow(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const transactions = await this.transactionRepo.find({
      where: {
        tenant_id: tenantId,
        status: TransactionStatus.COMPLETED,
        transaction_date: Between(startDate, endDate),
      },
      order: { transaction_date: 'ASC' },
    });

    let runningBalance = 0;
    const cashFlow = transactions.map((transaction) => {
      const amount = Number(transaction.total_amount);

      if (transaction.type === TransactionType.SALE) {
        runningBalance += amount;
      } else if (transaction.type === TransactionType.PURCHASE) {
        runningBalance -= amount;
      }

      return {
        date: transaction.transaction_date,
        transaction_number: transaction.transaction_number,
        type: transaction.type,
        amount,
        balance: runningBalance,
      };
    });

    return {
      startDate,
      endDate,
      startingBalance: 0,
      endingBalance: runningBalance,
      cashFlow,
    };
  }

  async getFinancialSummary(tenantId: string): Promise<any> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [dailyReport, monthlyReport, yearlyReport] = await Promise.all([
      this.getDailyReport(tenantId, today),
      this.getMonthlyReport(tenantId, today.getFullYear(), today.getMonth() + 1),
      this.getYearlyReport(tenantId, today.getFullYear()),
    ]);

    return {
      today: {
        income: dailyReport.total_income,
        outcome: dailyReport.total_outcome,
        profit: dailyReport.net_profit,
      },
      thisMonth: {
        income: monthlyReport.total_income,
        outcome: monthlyReport.total_outcome,
        profit: monthlyReport.net_profit,
      },
      thisYear: {
        income: yearlyReport.total_income,
        outcome: yearlyReport.total_outcome,
        profit: yearlyReport.net_profit,
      },
    };
  }
}
