import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TransactionEntity, TransactionType, TransactionStatus } from '../transactions/entities/transaction.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { User } from '../users/user.entity';
import { AuditLogEntity, AuditAction } from '../compliance-audit/entities/audit-log.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PlanFeature } from '../subscriptions/subscription.constants';
import type { JwtUser } from '../../types/express';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(TransactionEntity)
    private txRepo: Repository<TransactionEntity>,
    @InjectRepository(InventoryEntity)
    private invRepo: Repository<InventoryEntity>,
    @InjectRepository(ProductEntity)
    private productRepo: Repository<ProductEntity>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(AuditLogEntity)
    private auditRepo: Repository<AuditLogEntity>,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async getSummary(tenantId: string, user: JwtUser) {
    const subscription = await this.subscriptionsService.getCurrentSubscriptionForTenant(tenantId);
    const features = new Set<string>(subscription?.plan?.features ?? []);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const normalizedRole = (user.role ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    const isAdmin = user.isSystemAdmin || normalizedRole === 'admin' || normalizedRole === 'superadmin';
    const isManager = isAdmin || normalizedRole === 'manager';

    const [
      kpis,
      revenueChart,
      recentTransactions,
      inventorySummary,
      lowStockItems,
      userCount,
      planInfo,
      activityLogs,
      myStats,
      teamTransactions,
    ] = await Promise.all([
      this.getKpis(tenantId, features, startOfMonth, startOfLastMonth, endOfLastMonth),
      features.has(PlanFeature.TRANSACTIONS) ? this.getRevenueChart(tenantId, thirtyDaysAgo) : Promise.resolve([]),
      (isAdmin || isManager) && features.has(PlanFeature.TRANSACTIONS) ? this.getRecentTransactions(tenantId) : Promise.resolve([]),
      features.has(PlanFeature.INVENTORY) ? this.getInventorySummary(tenantId) : Promise.resolve(null),
      features.has(PlanFeature.INVENTORY) ? this.getLowStockItems(tenantId) : Promise.resolve([]),
      this.getUserCount(tenantId),
      Promise.resolve({
        planName: subscription?.plan?.name ?? 'No Plan',
        status: subscription?.status ?? 'none',
        billingCycle: subscription?.billingCycle ?? null,
        features: [...features],
      }),
      isAdmin ? this.getActivityLogs(tenantId) : Promise.resolve([]),
      features.has(PlanFeature.TRANSACTIONS) ? this.getMyStats(tenantId, user.sub) : Promise.resolve(null),
      isManager && features.has(PlanFeature.TRANSACTIONS) ? this.getTeamTransactions(tenantId) : Promise.resolve([]),
    ]);

    return {
      kpis,
      revenueChart,
      recentTransactions,
      inventorySummary,
      lowStockItems,
      userCount,
      planInfo,
      activityLogs,
      myStats,
      teamTransactions,
      enabledFeatures: [...features],
      role: { isAdmin, isManager },
    };
  }

  private async getKpis(
    tenantId: string,
    features: Set<string>,
    startOfMonth: string,
    startOfLastMonth: string,
    endOfLastMonth: string,
  ) {
    const kpis: Record<string, any> = {};

    if (features.has(PlanFeature.TRANSACTIONS)) {
      // Revenue MTD
      const [mtdResult, lastMonthResult] = await Promise.all([
        this.txRepo
          .createQueryBuilder('t')
          .select('COALESCE(SUM(t.total_amount), 0)', 'total')
          .where('t.tenant_id = :tenantId', { tenantId })
          .andWhere('t.type = :type', { type: TransactionType.SALE })
          .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
          .andWhere('t.transaction_date >= :start', { start: startOfMonth })
          .getRawOne(),
        this.txRepo
          .createQueryBuilder('t')
          .select('COALESCE(SUM(t.total_amount), 0)', 'total')
          .where('t.tenant_id = :tenantId', { tenantId })
          .andWhere('t.type = :type', { type: TransactionType.SALE })
          .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
          .andWhere('t.transaction_date >= :start', { start: startOfLastMonth })
          .andWhere('t.transaction_date <= :end', { end: endOfLastMonth })
          .getRawOne(),
      ]);

      const revenueMtd = parseFloat(mtdResult?.total ?? '0');
      const revenueLastMonth = parseFloat(lastMonthResult?.total ?? '0');
      const revenueGrowth = revenueLastMonth > 0
        ? ((revenueMtd - revenueLastMonth) / revenueLastMonth) * 100
        : 0;

      kpis.revenue = {
        value: revenueMtd,
        label: 'Revenue (MTD)',
        growth: Math.round(revenueGrowth * 10) / 10,
        prefix: '$',
      };

      // Pending transactions
      const pendingCount = await this.txRepo.count({
        where: { tenant_id: tenantId, status: TransactionStatus.PENDING },
      });
      kpis.pendingTransactions = { value: pendingCount, label: 'Pending Transactions' };
    }

    if (features.has(PlanFeature.INVENTORY)) {
      const invStats = await this.invRepo
        .createQueryBuilder('i')
        .select('COUNT(i.id)', 'total')
        .addSelect('COALESCE(SUM(i.quantity * i.unit_cost), 0)', 'value')
        .addSelect('COUNT(CASE WHEN i.available_quantity <= i.reorder_level THEN 1 END)', 'low_stock')
        .where('i.tenant_id = :tenantId', { tenantId })
        .getRawOne();

      kpis.inventoryValue = {
        value: parseFloat(invStats?.value ?? '0'),
        label: 'Inventory Value',
        prefix: '$',
        sub: `${invStats?.low_stock ?? 0} items low stock`,
      };
    }

    if (features.has(PlanFeature.PRODUCTS)) {
      const productStats = await this.productRepo
        .createQueryBuilder('p')
        .select('COUNT(p.id)', 'total')
        .addSelect('COUNT(CASE WHEN p.is_active = true THEN 1 END)', 'active')
        .where('p.tenant_id = :tenantId', { tenantId })
        .getRawOne();

      kpis.products = {
        value: parseInt(productStats?.active ?? '0'),
        label: 'Active Products',
        sub: `${productStats?.total ?? 0} total`,
      };
    }

    return kpis;
  }

  private async getRevenueChart(tenantId: string, since: string) {
    const rows = await this.txRepo
      .createQueryBuilder('t')
      .select("TO_CHAR(t.transaction_date, 'YYYY-MM-DD')", 'date')
      .addSelect(
        "COALESCE(SUM(CASE WHEN t.type = 'sale' AND t.status = 'completed' THEN t.total_amount ELSE 0 END), 0)",
        'sales',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN t.type = 'purchase' AND t.status = 'completed' THEN t.total_amount ELSE 0 END), 0)",
        'purchases',
      )
      .where('t.tenant_id = :tenantId', { tenantId })
      .andWhere('t.transaction_date >= :since', { since })
      .groupBy("TO_CHAR(t.transaction_date, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(t.transaction_date, 'YYYY-MM-DD')", 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      date: r.date,
      sales: parseFloat(r.sales),
      purchases: parseFloat(r.purchases),
    }));
  }

  private async getRecentTransactions(tenantId: string) {
    const rows = await this.txRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
      take: 8,
    });

    return rows.map((t) => ({
      id: t.id,
      number: t.transaction_number,
      type: t.type,
      status: t.status,
      amount: parseFloat(t.total_amount as any),
      customer: t.customer_name,
      date: t.transaction_date,
    }));
  }

  private async getInventorySummary(tenantId: string) {
    const result = await this.invRepo
      .createQueryBuilder('i')
      .select('COUNT(i.id)', 'total_items')
      .addSelect('COALESCE(SUM(i.quantity), 0)', 'total_qty')
      .addSelect('COALESCE(SUM(i.quantity * i.unit_cost), 0)', 'total_value')
      .addSelect('COUNT(CASE WHEN i.available_quantity <= 0 THEN 1 END)', 'out_of_stock')
      .addSelect('COUNT(CASE WHEN i.available_quantity > 0 AND i.available_quantity <= i.reorder_level THEN 1 END)', 'low_stock')
      .where('i.tenant_id = :tenantId', { tenantId })
      .getRawOne();

    return {
      totalItems: parseInt(result?.total_items ?? '0'),
      totalQty: parseInt(result?.total_qty ?? '0'),
      totalValue: parseFloat(result?.total_value ?? '0'),
      outOfStock: parseInt(result?.out_of_stock ?? '0'),
      lowStock: parseInt(result?.low_stock ?? '0'),
    };
  }

  private async getLowStockItems(tenantId: string) {
    return this.invRepo
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.available_quantity <= i.reorder_level')
      .orderBy('i.available_quantity', 'ASC')
      .take(5)
      .getMany()
      .then((items) =>
        items.map((i) => ({
          id: i.id,
          name: i.product_name,
          sku: i.sku,
          qty: i.available_quantity,
          reorderLevel: i.reorder_level,
        })),
      );
  }

  private async getUserCount(tenantId: string) {
    return this.userRepo.count({ where: { tenantId, is_active: true } });
  }

  private async getActivityLogs(tenantId: string) {
    const logs = await this.auditRepo.find({
      where: { tenant_id: tenantId },
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: 20,
    });
    return logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entity_type,
      description: l.description,
      severity: l.severity,
      userId: l.user_id,
      userName: l.user
        ? [l.user.first_name, l.user.last_name].filter(Boolean).join(' ') || l.user.email
        : null,
      userEmail: l.user?.email ?? null,
      createdAt: l.created_at,
    }));
  }

  private async getMyStats(tenantId: string, userId: string) {
    const result = await this.txRepo
      .createQueryBuilder('t')
      .select('COUNT(t.id)', 'count')
      .addSelect("COALESCE(SUM(CASE WHEN t.type = 'sale' AND t.status = 'completed' THEN t.total_amount ELSE 0 END), 0)", 'total_sales')
      .addSelect("COALESCE(SUM(CASE WHEN t.type = 'purchase' AND t.status = 'completed' THEN t.total_amount ELSE 0 END), 0)", 'total_purchases')
      .addSelect("COUNT(CASE WHEN t.status = 'pending' THEN 1 END)", 'pending')
      .where('t.tenant_id = :tenantId', { tenantId })
      .getRawOne();

    return {
      totalTransactions: parseInt(result?.count ?? '0'),
      totalSales: parseFloat(result?.total_sales ?? '0'),
      totalPurchases: parseFloat(result?.total_purchases ?? '0'),
      pending: parseInt(result?.pending ?? '0'),
    };
  }

  private async getTeamTransactions(tenantId: string) {
    const rows = await this.txRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
      take: 15,
    });
    return rows.map((t) => ({
      id: t.id,
      number: t.transaction_number,
      type: t.type,
      status: t.status,
      amount: parseFloat(t.total_amount as any),
      customer: t.customer_name,
      supplier: t.supplier_name,
      date: t.transaction_date,
    }));
  }
}
