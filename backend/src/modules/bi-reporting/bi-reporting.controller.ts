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
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { BiReportingService } from './bi-reporting.service';
import { RequireFeature } from '../subscriptions/decorators/require-feature.decorator';
import { RequireFeatureGuard } from '../subscriptions/guards/require-feature.guard';
import { PlanFeature } from '../subscriptions/subscription.constants';
import {
  CreateDashboardDto,
  UpdateDashboardDto,
} from './dto/create-dashboard.dto';
import {
  CreateWidgetDto,
  UpdateWidgetDto,
} from './dto/create-widget.dto';
import {
  CreateReportTemplateDto,
  UpdateReportTemplateDto,
  GenerateReportDto,
  ExecuteQueryDto,
} from './dto/create-report.dto';

@Controller('bi-reporting')
@UseGuards(JwtAuthGuard, RequireFeatureGuard)
@RequireFeature(PlanFeature.REPORTS)
export class BiReportingController {
  constructor(private readonly biReportingService: BiReportingService) {}

  // ==================== DASHBOARD ENDPOINTS ====================

  @Post('dashboards')
  createDashboard(
    @Body() data: CreateDashboardDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.biReportingService.createDashboard(
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Get('dashboards')
  getDashboards(@CurrentTenant() tenantId: string) {
    return this.biReportingService.getDashboards(tenantId);
  }

  @Get('dashboards/default')
  getDefaultDashboard(@CurrentTenant() tenantId: string) {
    return this.biReportingService.getDefaultDashboard(tenantId);
  }

  @Get('dashboards/my')
  getUserDashboards(@Request() req: any, @CurrentTenant() tenantId: string) {
    return this.biReportingService.getUserDashboards(
      req.user.userId,
      tenantId,
    );
  }

  @Get('dashboards/:id')
  getDashboard(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.biReportingService.getDashboard(id, tenantId);
  }

  @Put('dashboards/:id')
  updateDashboard(
    @Param('id') id: string,
    @Body() data: UpdateDashboardDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.biReportingService.updateDashboard(id, data, tenantId);
  }

  @Delete('dashboards/:id')
  deleteDashboard(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.biReportingService.deleteDashboard(id, tenantId);
  }

  // ==================== WIDGET ENDPOINTS ====================

  @Post('widgets')
  createWidget(
    @Body() data: CreateWidgetDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.biReportingService.createWidget(data, tenantId);
  }

  @Get('widgets/dashboard/:dashboardId')
  getWidgets(
    @Param('dashboardId') dashboardId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.biReportingService.getWidgets(dashboardId, tenantId);
  }

  @Get('widgets/:id')
  getWidget(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.biReportingService.getWidget(id, tenantId);
  }

  @Get('widgets/:id/data')
  getWidgetData(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.biReportingService.getWidgetData(id, tenantId);
  }

  @Put('widgets/:id')
  updateWidget(
    @Param('id') id: string,
    @Body() data: UpdateWidgetDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.biReportingService.updateWidget(id, data, tenantId);
  }

  @Delete('widgets/:id')
  deleteWidget(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.biReportingService.deleteWidget(id, tenantId);
  }

  // ==================== REPORT TEMPLATE ENDPOINTS ====================

  @Post('templates')
  createTemplate(
    @Body() data: CreateReportTemplateDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.biReportingService.createTemplate(
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Get('templates')
  getTemplates(@CurrentTenant() tenantId: string) {
    return this.biReportingService.getTemplates(tenantId);
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.biReportingService.getTemplate(id, tenantId);
  }

  @Put('templates/:id')
  updateTemplate(
    @Param('id') id: string,
    @Body() data: UpdateReportTemplateDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.biReportingService.updateTemplate(id, data, tenantId);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.biReportingService.deleteTemplate(id, tenantId);
  }

  // ==================== REPORT GENERATION ENDPOINTS ====================

  @Post('reports/generate')
  generateReport(
    @Body() data: GenerateReportDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.biReportingService.generateReport(
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Get('reports')
  getSavedReports(@CurrentTenant() tenantId: string) {
    return this.biReportingService.getSavedReports(tenantId);
  }

  @Get('reports/:id')
  getSavedReport(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.biReportingService.getSavedReport(id, tenantId);
  }

  // ==================== QUERY EXECUTION ENDPOINTS ====================

  @Post('query/execute')
  executeQuery(
    @Body() data: ExecuteQueryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.biReportingService.executeQuery(data, tenantId);
  }

  // ==================== ANALYTICS ENDPOINTS ====================

  @Get('analytics/kpis')
  getKPIs(@CurrentTenant() tenantId: string) {
    return this.biReportingService.getKPIs(tenantId);
  }

  @Get('analytics/trends')
  getTrendData(
    @Query('metric') metric: string,
    @Query('period') period: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.biReportingService.getTrendData(metric, period, tenantId);
  }

  // ==================== EXPORT ENDPOINTS ====================

  @Get('exports/logs')
  getExportLogs(@CurrentTenant() tenantId: string) {
    return this.biReportingService.getExportLogs(tenantId);
  }
}
