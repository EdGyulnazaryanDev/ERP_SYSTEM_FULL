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
import { ComplianceAuditService } from './compliance-audit.service';
import type {
  CreateAuditLogDto,
  QueryAuditLogsDto,
} from './dto/create-audit-log.dto';
import type {
  CreateComplianceRuleDto,
  UpdateComplianceRuleDto,
  ExecuteComplianceCheckDto,
} from './dto/create-compliance-rule.dto';
import type {
  CreateRetentionPolicyDto,
  UpdateRetentionPolicyDto,
  ExecuteRetentionPolicyDto,
} from './dto/create-retention-policy.dto';
import type { CreateComplianceReportDto } from './dto/create-compliance-report.dto';
import type { CreateAccessLogDto } from './dto/create-access-log.dto';

@Controller('compliance-audit')
@UseGuards(JwtAuthGuard)
export class ComplianceAuditController {
  constructor(
    private readonly complianceAuditService: ComplianceAuditService,
  ) {}

  // ==================== AUDIT LOG ENDPOINTS ====================

  @Post('audit-logs')
  createAuditLog(
    @Body() data: CreateAuditLogDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.complianceAuditService.createAuditLog(
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Get('audit-logs')
  getAuditLogs(
    @Query() query: QueryAuditLogsDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.complianceAuditService.getAuditLogs(query, tenantId);
  }

  /** Must be registered before :id so "statistics" is not parsed as an id. */
  @Get('audit-logs/statistics')
  getAuditStatistics(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.complianceAuditService.getAuditStatistics(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('audit-logs/:id')
  getAuditLog(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.complianceAuditService.getAuditLog(id, tenantId);
  }

  // ==================== COMPLIANCE RULE ENDPOINTS ====================

  @Post('rules')
  createRule(
    @Body() data: CreateComplianceRuleDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.complianceAuditService.createRule(
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Get('rules')
  getRules(@CurrentTenant() tenantId: string) {
    return this.complianceAuditService.getRules(tenantId);
  }

  @Get('rules/:id')
  getRule(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.complianceAuditService.getRule(id, tenantId);
  }

  @Put('rules/:id')
  updateRule(
    @Param('id') id: string,
    @Body() data: UpdateComplianceRuleDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.complianceAuditService.updateRule(
      id,
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.complianceAuditService.deleteRule(id, tenantId);
  }

  @Post('rules/:id/check')
  executeComplianceCheck(
    @Param('id') id: string,
    @Body() data: ExecuteComplianceCheckDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.complianceAuditService.executeComplianceCheck(
      id,
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Get('checks')
  getComplianceChecks(
    @Query('rule_id') ruleId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.complianceAuditService.getComplianceChecks(tenantId, ruleId);
  }

  // ==================== DATA RETENTION POLICY ENDPOINTS ====================

  @Post('policies')
  createPolicy(
    @Body() data: CreateRetentionPolicyDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.complianceAuditService.createPolicy(
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Get('policies')
  getPolicies(@CurrentTenant() tenantId: string) {
    return this.complianceAuditService.getPolicies(tenantId);
  }

  @Get('policies/:id')
  getPolicy(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.complianceAuditService.getPolicy(id, tenantId);
  }

  @Put('policies/:id')
  updatePolicy(
    @Param('id') id: string,
    @Body() data: UpdateRetentionPolicyDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.complianceAuditService.updatePolicy(
      id,
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Delete('policies/:id')
  deletePolicy(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.complianceAuditService.deletePolicy(id, tenantId);
  }

  @Post('policies/:id/execute')
  executeRetentionPolicy(
    @Param('id') id: string,
    @Body() data: ExecuteRetentionPolicyDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.complianceAuditService.executeRetentionPolicy(
      id,
      data,
      tenantId,
    );
  }

  // ==================== COMPLIANCE REPORT ENDPOINTS ====================

  @Post('reports')
  createReport(
    @Body() data: CreateComplianceReportDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.complianceAuditService.createReport(
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Get('reports')
  getReports(@CurrentTenant() tenantId: string) {
    return this.complianceAuditService.getReports(tenantId);
  }

  @Get('reports/:id')
  getReport(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.complianceAuditService.getReport(id, tenantId);
  }

  // ==================== ACCESS LOG ENDPOINTS ====================

  @Post('access-logs')
  createAccessLog(
    @Body() body: CreateAccessLogDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.complianceAuditService.logAccess(
      req.user.userId,
      body.access_type,
      body.resource_type,
      body.resource_id ?? '',
      body.result,
      tenantId,
      body.metadata,
    );
  }

  @Get('access-logs')
  getAccessLogs(
    @Query('user_id') userId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.complianceAuditService.getAccessLogs(
      tenantId,
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
