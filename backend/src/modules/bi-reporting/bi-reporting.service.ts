import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DashboardEntity } from './entities/dashboard.entity';
import { DashboardWidgetEntity } from './entities/dashboard-widget.entity';
import { ReportTemplateEntity } from './entities/report-template.entity';
import {
  SavedReportEntity,
  ReportStatus,
} from './entities/saved-report.entity';
import {
  DataExportLogEntity,
  ExportStatus,
} from './entities/data-export-log.entity';
import type {
  CreateDashboardDto,
  UpdateDashboardDto,
} from './dto/create-dashboard.dto';
import type {
  CreateWidgetDto,
  UpdateWidgetDto,
} from './dto/create-widget.dto';
import type {
  CreateReportTemplateDto,
  UpdateReportTemplateDto,
  GenerateReportDto,
  ExecuteQueryDto,
} from './dto/create-report.dto';

@Injectable()
export class BiReportingService {
  constructor(
    @InjectRepository(DashboardEntity)
    private dashboardRepo: Repository<DashboardEntity>,
    @InjectRepository(DashboardWidgetEntity)
    private widgetRepo: Repository<DashboardWidgetEntity>,
    @InjectRepository(ReportTemplateEntity)
    private templateRepo: Repository<ReportTemplateEntity>,
    @InjectRepository(SavedReportEntity)
    private savedReportRepo: Repository<SavedReportEntity>,
    @InjectRepository(DataExportLogEntity)
    private exportLogRepo: Repository<DataExportLogEntity>,
    private dataSource: DataSource,
  ) {}

  // ==================== DASHBOARD METHODS ====================

  async createDashboard(
    data: CreateDashboardDto,
    userId: string,
    tenantId: string,
  ): Promise<DashboardEntity> {
    const dashboard = this.dashboardRepo.create({
      ...data,
      created_by: userId,
      tenant_id: tenantId,
    });

    return this.dashboardRepo.save(dashboard);
  }

  async getDashboards(tenantId: string): Promise<DashboardEntity[]> {
    return this.dashboardRepo.find({
      where: { tenant_id: tenantId },
      relations: ['widgets'],
      order: { sort_order: 'ASC', created_at: 'DESC' },
    });
  }

  async getDashboard(
    id: string,
    tenantId: string,
  ): Promise<DashboardEntity> {
    const dashboard = await this.dashboardRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['widgets'],
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    return dashboard;
  }

  async updateDashboard(
    id: string,
    data: UpdateDashboardDto,
    tenantId: string,
  ): Promise<DashboardEntity> {
    const dashboard = await this.getDashboard(id, tenantId);
    Object.assign(dashboard, data);
    return this.dashboardRepo.save(dashboard);
  }

  async deleteDashboard(id: string, tenantId: string): Promise<void> {
    const dashboard = await this.getDashboard(id, tenantId);
    await this.dashboardRepo.remove(dashboard);
  }

  async getUserDashboards(
    userId: string,
    tenantId: string,
  ): Promise<DashboardEntity[]> {
    return this.dashboardRepo.find({
      where: { created_by: userId, tenant_id: tenantId },
      relations: ['widgets'],
      order: { sort_order: 'ASC' },
    });
  }

  async getDefaultDashboard(tenantId: string): Promise<DashboardEntity | null> {
    return this.dashboardRepo.findOne({
      where: { is_default: true, tenant_id: tenantId },
      relations: ['widgets'],
    });
  }

  // ==================== WIDGET METHODS ====================

  async createWidget(
    data: CreateWidgetDto,
    tenantId: string,
  ): Promise<DashboardWidgetEntity> {
    await this.getDashboard(data.dashboard_id, tenantId);

    const widget = this.widgetRepo.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.widgetRepo.save(widget);
  }

  async getWidgets(
    dashboardId: string,
    tenantId: string,
  ): Promise<DashboardWidgetEntity[]> {
    return this.widgetRepo.find({
      where: { dashboard_id: dashboardId, tenant_id: tenantId },
      order: { sort_order: 'ASC' },
    });
  }

  async getWidget(
    id: string,
    tenantId: string,
  ): Promise<DashboardWidgetEntity> {
    const widget = await this.widgetRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    return widget;
  }

  async updateWidget(
    id: string,
    data: UpdateWidgetDto,
    tenantId: string,
  ): Promise<DashboardWidgetEntity> {
    const widget = await this.getWidget(id, tenantId);
    Object.assign(widget, data);
    return this.widgetRepo.save(widget);
  }

  async deleteWidget(id: string, tenantId: string): Promise<void> {
    const widget = await this.getWidget(id, tenantId);
    await this.widgetRepo.remove(widget);
  }

  async getWidgetData(id: string, tenantId: string): Promise<any> {
    const widget = await this.getWidget(id, tenantId);

    if (!widget.query) {
      throw new BadRequestException('Widget has no query defined');
    }

    try {
      const result = await this.executeQuery({
        query: widget.query,
        parameters: widget.config?.parameters || {},
      }, tenantId);

      return {
        widget_id: widget.id,
        title: widget.title,
        widget_type: widget.widget_type,
        chart_type: widget.chart_type,
        data: result,
        config: widget.config,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch widget data: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // ==================== REPORT TEMPLATE METHODS ====================

  async createTemplate(
    data: CreateReportTemplateDto,
    userId: string,
    tenantId: string,
  ): Promise<ReportTemplateEntity> {
    const template = this.templateRepo.create({
      ...data,
      created_by: userId,
      tenant_id: tenantId,
    });

    return this.templateRepo.save(template);
  }

  async getTemplates(tenantId: string): Promise<ReportTemplateEntity[]> {
    return this.templateRepo.find({
      where: { tenant_id: tenantId, is_active: true },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async getTemplate(
    id: string,
    tenantId: string,
  ): Promise<ReportTemplateEntity> {
    const template = await this.templateRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!template) {
      throw new NotFoundException('Report template not found');
    }

    return template;
  }

  async updateTemplate(
    id: string,
    data: UpdateReportTemplateDto,
    tenantId: string,
  ): Promise<ReportTemplateEntity> {
    const template = await this.getTemplate(id, tenantId);
    Object.assign(template, data);
    return this.templateRepo.save(template);
  }

  async deleteTemplate(id: string, tenantId: string): Promise<void> {
    const template = await this.getTemplate(id, tenantId);

    if (template.is_system) {
      throw new BadRequestException('Cannot delete system template');
    }

    await this.templateRepo.remove(template);
  }

  // ==================== REPORT GENERATION METHODS ====================

  async generateReport(
    data: GenerateReportDto,
    userId: string,
    tenantId: string,
  ): Promise<SavedReportEntity> {
    const template = await this.getTemplate(data.template_id, tenantId);

    if (!template.supported_formats.includes(data.format)) {
      throw new BadRequestException(
        `Format ${data.format} not supported for this template`,
      );
    }

    const savedReport = this.savedReportRepo.create({
      ...data,
      generated_by: userId,
      tenant_id: tenantId,
      status: ReportStatus.PENDING,
    });

    const saved = await this.savedReportRepo.save(savedReport);

    // Trigger async report generation
    this.processReport(saved.id, tenantId).catch((error) => {
      console.error('Report generation failed:', error);
    });

    return saved;
  }

  private async processReport(
    reportId: string,
    tenantId: string,
  ): Promise<void> {
    const report = await this.savedReportRepo.findOne({
      where: { id: reportId, tenant_id: tenantId },
      relations: ['template'],
    });

    if (!report) return;

    try {
      report.status = ReportStatus.PROCESSING;
      await this.savedReportRepo.save(report);

      // Execute query
      const result = await this.executeQuery({
        query: report.template.query,
        parameters: { ...report.parameters, ...report.filters },
      }, tenantId);

      report.row_count = result.length;
      report.status = ReportStatus.COMPLETED;
      report.generated_at = new Date();

      // In production, generate actual file and store
      report.file_path = `/reports/${reportId}.${report.format}`;
      report.file_url = `/api/reports/download/${reportId}`;
      report.file_size = JSON.stringify(result).length;

      await this.savedReportRepo.save(report);

      await this.logExport(
        report.template?.name ?? 'report',
        report.format,
        result.length,
        report.generated_by,
        tenantId,
      );
    } catch (error) {
      report.status = ReportStatus.FAILED;
      report.error_message = error.message;
      await this.savedReportRepo.save(report);
    }
  }

  async getSavedReports(tenantId: string): Promise<SavedReportEntity[]> {
    return this.savedReportRepo.find({
      where: { tenant_id: tenantId },
      relations: ['template'],
      order: { created_at: 'DESC' },
    });
  }

  async getSavedReport(
    id: string,
    tenantId: string,
  ): Promise<SavedReportEntity> {
    const report = await this.savedReportRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['template'],
    });

    if (!report) {
      throw new NotFoundException('Saved report not found');
    }

    return report;
  }

  // ==================== QUERY EXECUTION METHODS ====================

  async executeQuery(data: ExecuteQueryDto, tenantId: string): Promise<any[]> {
    try {
      let sql = data.query.trim().replace(/;+\s*$/g, '');
      if (!sql) {
        throw new BadRequestException('Query is empty');
      }

      this.assertReadOnlyReportingSql(sql);

      let maxPlaceholder = this.getMaxPgPlaceholderIndex(sql);
      if (maxPlaceholder === 0) {
        sql = this.injectTenantFilter(sql);
        maxPlaceholder = this.getMaxPgPlaceholderIndex(sql);
      } else {
        if (!/\$1\b/.test(sql)) {
          throw new BadRequestException(
            'When using bind parameters, $1 must be your tenant id (e.g. WHERE tenant_id = $1).',
          );
        }
      }

      if (maxPlaceholder < 1) {
        throw new BadRequestException(
          'Could not prepare a tenant-safe query. Include tenant_id = $1 or omit placeholders for auto-filter.',
        );
      }

      const params = this.buildQueryParameters(
        maxPlaceholder,
        tenantId,
        data.parameters,
      );

      const raw = await this.dataSource.query(sql, params);
      return this.serializeQueryRows(raw);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Query execution failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Only allow read-style statements (single statement). */
  private assertReadOnlyReportingSql(sql: string): void {
    const stripped = sql
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/--[^\n]*/g, ' ');
    const head = stripped.trim().toLowerCase();
    if (!/^(select|with|explain)\b/.test(head)) {
      throw new BadRequestException(
        'Only SELECT, WITH, or EXPLAIN queries are allowed in the BI query lab.',
      );
    }
    if (/;\s*\S/.test(sql)) {
      throw new BadRequestException('Multiple SQL statements are not allowed.');
    }
    const forbidden =
      /\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|copy\s+\(|into\s+outfile)\b/i;
    if (forbidden.test(stripped)) {
      throw new BadRequestException(
        'Destructive or DDL keywords are not allowed in reporting queries.',
      );
    }
  }

  /**
   * When the query has no $n placeholders, append tenant scoping.
   * Skips if tenant_id filter already appears.
   */
  private injectTenantFilter(sql: string): string {
    const s = sql.trim();
    if (/\btenant_id\s*=/i.test(s)) {
      return s;
    }
    const hasWhere = /\bwhere\b/i.test(s);
    const insertBefore =
      /\b(order\s+by|group\s+by|limit|offset|having)\b/i;
    const m = s.match(insertBefore);
    const clause = hasWhere ? ' AND tenant_id = $1' : ' WHERE tenant_id = $1';
    if (m && m.index !== undefined) {
      return s.slice(0, m.index).trim() + clause + ' ' + s.slice(m.index);
    }
    return s + clause;
  }

  private serializeQueryRows(rows: unknown): any[] {
    if (!Array.isArray(rows)) {
      return [];
    }
    return rows.map((row) => {
      if (row === null || typeof row !== 'object') {
        return row;
      }
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
        if (typeof v === 'bigint') {
          out[k] = v.toString();
        } else if (v instanceof Date) {
          out[k] = v.toISOString();
        } else {
          out[k] = v;
        }
      }
      return out;
    });
  }

  /** Highest $n used in the query (PostgreSQL-style placeholders). */
  private getMaxPgPlaceholderIndex(sql: string): number {
    let max = 0;
    const re = /\$(\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
    return max;
  }

  /** $1 is always tenant_id; $2… filled from optional parameters. */
  private buildQueryParameters(
    maxPlaceholder: number,
    tenantId: string,
    parameters: unknown,
  ): unknown[] {
    const params: unknown[] = [];
    for (let i = 1; i <= maxPlaceholder; i++) {
      if (i === 1) {
        params.push(tenantId);
        continue;
      }
      let val: unknown;
      if (Array.isArray(parameters)) {
        val = parameters[i - 2];
      } else if (parameters && typeof parameters === 'object') {
        const o = parameters as Record<string, unknown>;
        val =
          o[String(i)] ??
          o[`$${i}`] ??
          o[`p${i}`];
      }
      params.push(val ?? null);
    }
    return params;
  }

  // ==================== ANALYTICS METHODS ====================

  async getKPIs(tenantId: string): Promise<any> {
    // Example KPIs - customize based on your needs
    const kpis = {
      total_revenue: await this.calculateTotalRevenue(tenantId),
      total_orders: await this.calculateTotalOrders(tenantId),
      active_customers: await this.calculateActiveCustomers(tenantId),
      inventory_value: await this.calculateInventoryValue(tenantId),
    };

    return kpis;
  }

  private async calculateTotalRevenue(tenantId: string): Promise<number> {
    try {
      const result = await this.dataSource.query(
        `SELECT COALESCE(SUM(total_amount), 0) as revenue 
         FROM transactions 
         WHERE tenant_id = $1 AND type = 'sale'`,
        [tenantId],
      );
      return Number(result[0]?.revenue || 0);
    } catch {
      return 0;
    }
  }

  private async calculateTotalOrders(tenantId: string): Promise<number> {
    try {
      const result = await this.dataSource.query(
        `SELECT COUNT(*) as count 
         FROM transactions 
         WHERE tenant_id = $1`,
        [tenantId],
      );
      return Number(result[0]?.count || 0);
    } catch {
      return 0;
    }
  }

  private async calculateActiveCustomers(tenantId: string): Promise<number> {
    try {
      const result = await this.dataSource.query(
        `SELECT COUNT(DISTINCT customer_id) as count 
         FROM transactions 
         WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
        [tenantId],
      );
      return Number(result[0]?.count || 0);
    } catch {
      return 0;
    }
  }

  private async calculateInventoryValue(tenantId: string): Promise<number> {
    try {
      const result = await this.dataSource.query(
        `SELECT COALESCE(SUM(quantity * unit_price), 0) as value 
         FROM inventory 
         WHERE tenant_id = $1`,
        [tenantId],
      );
      return Number(result[0]?.value || 0);
    } catch {
      return 0;
    }
  }

  async getTrendData(
    metric: string,
    period: string,
    tenantId: string,
  ): Promise<any[]> {
    // Example trend data - customize based on metric and period
    const query = this.buildTrendQuery(metric, period);
    
    try {
      return await this.dataSource.query(query, [tenantId]);
    } catch (error) {
      throw new BadRequestException(`Failed to fetch trend data: ${error.message}`);
    }
  }

  private buildTrendQuery(_metric: string, period: string): string {
    const trunc =
      period === 'daily'
        ? 'day'
        : period === 'weekly'
          ? 'week'
          : 'month';
    const lookback =
      period === 'daily'
        ? '30 days'
        : period === 'weekly'
          ? '84 days'
          : '24 months';

    return `
      SELECT 
        DATE_TRUNC('${trunc}', created_at) AS period,
        COUNT(*)::int AS count,
        COALESCE(SUM(total_amount), 0)::numeric AS total
      FROM transactions
      WHERE tenant_id = $1
        AND created_at >= NOW() - INTERVAL '${lookback}'
      GROUP BY DATE_TRUNC('${trunc}', created_at)
      ORDER BY period ASC
    `;
  }

  // ==================== EXPORT METHODS ====================

  async logExport(
    entityName: string,
    format: string,
    recordCount: number,
    userId: string,
    tenantId: string,
  ): Promise<DataExportLogEntity> {
    const log = this.exportLogRepo.create({
      export_type: 'data' as any,
      entity_name: entityName,
      format,
      record_count: recordCount,
      status: ExportStatus.COMPLETED,
      exported_by: userId,
      started_at: new Date(),
      completed_at: new Date(),
      tenant_id: tenantId,
    });

    return this.exportLogRepo.save(log);
  }

  async getExportLogs(tenantId: string): Promise<DataExportLogEntity[]> {
    return this.exportLogRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }
}
