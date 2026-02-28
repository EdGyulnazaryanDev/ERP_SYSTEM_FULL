import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { AuditLogEntity, AuditSeverity } from './entities/audit-log.entity';
import { ComplianceRuleEntity, RuleStatus } from './entities/compliance-rule.entity';
import { ComplianceCheckEntity, CheckStatus, CheckTrigger } from './entities/compliance-check.entity';
import { DataRetentionPolicyEntity, PolicyStatus } from './entities/data-retention-policy.entity';
import { ComplianceReportEntity, ReportType, ReportStatus } from './entities/compliance-report.entity';
import { AccessLogEntity, AccessResult } from './entities/access-log.entity';
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

@Injectable()
export class ComplianceAuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private auditLogRepo: Repository<AuditLogEntity>,
    @InjectRepository(ComplianceRuleEntity)
    private ruleRepo: Repository<ComplianceRuleEntity>,
    @InjectRepository(ComplianceCheckEntity)
    private checkRepo: Repository<ComplianceCheckEntity>,
    @InjectRepository(DataRetentionPolicyEntity)
    private policyRepo: Repository<DataRetentionPolicyEntity>,
    @InjectRepository(ComplianceReportEntity)
    private reportRepo: Repository<ComplianceReportEntity>,
    @InjectRepository(AccessLogEntity)
    private accessLogRepo: Repository<AccessLogEntity>,
  ) {}

  // ==================== AUDIT LOG METHODS ====================

  async createAuditLog(
    data: CreateAuditLogDto,
    userId: string,
    tenantId: string,
  ): Promise<AuditLogEntity> {
    const auditLog = this.auditLogRepo.create({
      ...data,
      user_id: userId,
      tenant_id: tenantId,
      severity: data.severity || AuditSeverity.LOW,
    });

    return this.auditLogRepo.save(auditLog);
  }

  async getAuditLogs(
    query: QueryAuditLogsDto,
    tenantId: string,
  ): Promise<AuditLogEntity[]> {
    const where: any = { tenant_id: tenantId };

    if (query.user_id) where.user_id = query.user_id;
    if (query.action) where.action = query.action;
    if (query.entity_type) where.entity_type = query.entity_type;
    if (query.entity_id) where.entity_id = query.entity_id;
    if (query.severity) where.severity = query.severity;

    if (query.start_date && query.end_date) {
      where.created_at = Between(
        new Date(query.start_date),
        new Date(query.end_date),
      );
    }

    return this.auditLogRepo.find({
      where,
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: 1000, // Limit for performance
    });
  }

  async getAuditLog(
    id: string,
    tenantId: string,
  ): Promise<AuditLogEntity> {
    const log = await this.auditLogRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['user'],
    });

    if (!log) {
      throw new NotFoundException('Audit log not found');
    }

    return log;
  }

  async getAuditStatistics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const logs = await this.auditLogRepo.find({
      where: {
        tenant_id: tenantId,
        created_at: Between(startDate, endDate),
      },
    });

    const stats = {
      total_logs: logs.length,
      by_action: {} as Record<string, number>,
      by_severity: {} as Record<string, number>,
      by_entity_type: {} as Record<string, number>,
      by_user: {} as Record<string, number>,
    };

    logs.forEach((log) => {
      stats.by_action[log.action] = (stats.by_action[log.action] || 0) + 1;
      stats.by_severity[log.severity] = (stats.by_severity[log.severity] || 0) + 1;
      stats.by_entity_type[log.entity_type] = (stats.by_entity_type[log.entity_type] || 0) + 1;
      if (log.user_id) {
        stats.by_user[log.user_id] = (stats.by_user[log.user_id] || 0) + 1;
      }
    });

    return stats;
  }

  // ==================== COMPLIANCE RULE METHODS ====================

  async createRule(
    data: CreateComplianceRuleDto,
    userId: string,
    tenantId: string,
  ): Promise<ComplianceRuleEntity> {
    const rule = this.ruleRepo.create({
      ...data,
      created_by: userId,
      tenant_id: tenantId,
    });

    return this.ruleRepo.save(rule);
  }

  async getRules(tenantId: string): Promise<ComplianceRuleEntity[]> {
    return this.ruleRepo.find({
      where: { tenant_id: tenantId },
      order: { priority: 'DESC', created_at: 'DESC' },
    });
  }

  async getRule(
    id: string,
    tenantId: string,
  ): Promise<ComplianceRuleEntity> {
    const rule = await this.ruleRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!rule) {
      throw new NotFoundException('Compliance rule not found');
    }

    return rule;
  }

  async updateRule(
    id: string,
    data: UpdateComplianceRuleDto,
    userId: string,
    tenantId: string,
  ): Promise<ComplianceRuleEntity> {
    const rule = await this.getRule(id, tenantId);

    Object.assign(rule, {
      ...data,
      updated_by: userId,
    });

    return this.ruleRepo.save(rule);
  }

  async deleteRule(id: string, tenantId: string): Promise<void> {
    const rule = await this.getRule(id, tenantId);
    await this.ruleRepo.remove(rule);
  }

  async executeComplianceCheck(
    ruleId: string,
    data: ExecuteComplianceCheckDto,
    userId: string,
    tenantId: string,
  ): Promise<ComplianceCheckEntity> {
    const rule = await this.getRule(ruleId, tenantId);

    if (rule.status !== RuleStatus.ACTIVE) {
      throw new BadRequestException('Rule is not active');
    }

    const startTime = Date.now();
    let status = CheckStatus.PASSED;
    let violations: any[] = [];
    let resultMessage = 'Compliance check passed';

    try {
      // Execute compliance check based on rule conditions
      const checkResult = await this.performComplianceCheck(rule, data.context);
      
      status = checkResult.status;
      violations = checkResult.violations;
      resultMessage = checkResult.message;
    } catch (error) {
      status = CheckStatus.FAILED;
      resultMessage = `Check failed: ${error.message}`;
    }

    const check = this.checkRepo.create({
      rule_id: ruleId,
      status,
      trigger: CheckTrigger.MANUAL,
      result_message: resultMessage,
      result_data: data.context,
      violations_count: violations.length,
      violations,
      execution_time_ms: Date.now() - startTime,
      checked_by: userId,
      tenant_id: tenantId,
    });

    return this.checkRepo.save(check);
  }

  private async performComplianceCheck(
    rule: ComplianceRuleEntity,
    context: any,
  ): Promise<{ status: CheckStatus; violations: any[]; message: string }> {
    // Implement compliance check logic based on rule type
    // This is a placeholder - actual implementation would depend on specific requirements
    
    const violations: any[] = [];
    let status = CheckStatus.PASSED;
    let message = 'Compliance check passed';

    // Example: Check data retention compliance
    if (rule.rule_type === 'data_retention') {
      // Implement data retention check logic
    }

    // Example: Check access control compliance
    if (rule.rule_type === 'access_control') {
      // Implement access control check logic
    }

    if (violations.length > 0) {
      status = CheckStatus.FAILED;
      message = `Found ${violations.length} violation(s)`;
    }

    return { status, violations, message };
  }

  async getComplianceChecks(
    tenantId: string,
    ruleId?: string,
  ): Promise<ComplianceCheckEntity[]> {
    const where: any = { tenant_id: tenantId };
    if (ruleId) where.rule_id = ruleId;

    return this.checkRepo.find({
      where,
      relations: ['rule'],
      order: { checked_at: 'DESC' },
    });
  }

  // ==================== DATA RETENTION POLICY METHODS ====================

  async createPolicy(
    data: CreateRetentionPolicyDto,
    userId: string,
    tenantId: string,
  ): Promise<DataRetentionPolicyEntity> {
    const policy = this.policyRepo.create({
      ...data,
      created_by: userId,
      tenant_id: tenantId,
    });

    return this.policyRepo.save(policy);
  }

  async getPolicies(tenantId: string): Promise<DataRetentionPolicyEntity[]> {
    return this.policyRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async getPolicy(
    id: string,
    tenantId: string,
  ): Promise<DataRetentionPolicyEntity> {
    const policy = await this.policyRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!policy) {
      throw new NotFoundException('Data retention policy not found');
    }

    return policy;
  }

  async updatePolicy(
    id: string,
    data: UpdateRetentionPolicyDto,
    userId: string,
    tenantId: string,
  ): Promise<DataRetentionPolicyEntity> {
    const policy = await this.getPolicy(id, tenantId);

    Object.assign(policy, {
      ...data,
      updated_by: userId,
    });

    return this.policyRepo.save(policy);
  }

  async deletePolicy(id: string, tenantId: string): Promise<void> {
    const policy = await this.getPolicy(id, tenantId);
    await this.policyRepo.remove(policy);
  }

  async executeRetentionPolicy(
    policyId: string,
    data: ExecuteRetentionPolicyDto,
    tenantId: string,
  ): Promise<{ processed: number; message: string }> {
    const policy = await this.getPolicy(policyId, tenantId);

    if (policy.status !== PolicyStatus.ACTIVE) {
      throw new BadRequestException('Policy is not active');
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

    // Implement retention policy execution
    // This is a placeholder - actual implementation would query and process records
    const processed = 0;

    if (!data.dry_run) {
      policy.last_executed_at = new Date();
      policy.records_processed = policy.records_processed + processed;
      await this.policyRepo.save(policy);
    }

    return {
      processed,
      message: data.dry_run
        ? `Dry run: Would process ${processed} records`
        : `Processed ${processed} records`,
    };
  }

  // ==================== COMPLIANCE REPORT METHODS ====================

  async createReport(
    data: CreateComplianceReportDto,
    userId: string,
    tenantId: string,
  ): Promise<ComplianceReportEntity> {
    const report = this.reportRepo.create({
      ...data,
      start_date: new Date(data.start_date),
      end_date: new Date(data.end_date),
      generated_by: userId,
      tenant_id: tenantId,
    });

    const savedReport = await this.reportRepo.save(report);

    // Generate report asynchronously
    this.generateReport(savedReport.id, tenantId).catch((error) => {
      console.error('Report generation failed:', error);
    });

    return savedReport;
  }

  private async generateReport(
    reportId: string,
    tenantId: string,
  ): Promise<void> {
    const report = await this.reportRepo.findOne({
      where: { id: reportId, tenant_id: tenantId },
    });

    if (!report) return;

    try {
      // Generate report based on type
      const summary = await this.generateReportSummary(
        report.report_type,
        report.start_date,
        report.end_date,
        report.filters,
        tenantId,
      );

      report.summary = summary;
      report.status = ReportStatus.COMPLETED;
      await this.reportRepo.save(report);
    } catch (error) {
      report.status = ReportStatus.FAILED;
      await this.reportRepo.save(report);
    }
  }

  private async generateReportSummary(
    reportType: ReportType,
    startDate: Date,
    endDate: Date,
    filters: any,
    tenantId: string,
  ): Promise<any> {
    const summary: any = {};

    switch (reportType) {
      case ReportType.AUDIT_SUMMARY:
        summary.audit_stats = await this.getAuditStatistics(
          tenantId,
          startDate,
          endDate,
        );
        break;

      case ReportType.COMPLIANCE_STATUS:
        const checks = await this.checkRepo.find({
          where: {
            tenant_id: tenantId,
            checked_at: Between(startDate, endDate),
          },
        });
        summary.total_checks = checks.length;
        summary.passed = checks.filter((c) => c.status === CheckStatus.PASSED).length;
        summary.failed = checks.filter((c) => c.status === CheckStatus.FAILED).length;
        summary.warnings = checks.filter((c) => c.status === CheckStatus.WARNING).length;
        break;

      case ReportType.VIOLATION_REPORT:
        const violations = await this.checkRepo.find({
          where: {
            tenant_id: tenantId,
            status: In([CheckStatus.FAILED, CheckStatus.WARNING]),
            checked_at: Between(startDate, endDate),
          },
          relations: ['rule'],
        });
        summary.total_violations = violations.reduce(
          (sum, v) => sum + v.violations_count,
          0,
        );
        summary.by_rule = violations.map((v) => ({
          rule_name: v.rule.rule_name,
          violations: v.violations_count,
        }));
        break;

      case ReportType.ACCESS_REPORT:
        const accessLogs = await this.accessLogRepo.find({
          where: {
            tenant_id: tenantId,
            accessed_at: Between(startDate, endDate),
          },
        });
        summary.total_accesses = accessLogs.length;
        summary.granted = accessLogs.filter(
          (a) => a.result === AccessResult.GRANTED,
        ).length;
        summary.denied = accessLogs.filter(
          (a) => a.result === AccessResult.DENIED,
        ).length;
        break;

      default:
        summary.message = 'Report type not implemented';
    }

    return summary;
  }

  async getReports(tenantId: string): Promise<ComplianceReportEntity[]> {
    return this.reportRepo.find({
      where: { tenant_id: tenantId },
      order: { generated_at: 'DESC' },
    });
  }

  async getReport(
    id: string,
    tenantId: string,
  ): Promise<ComplianceReportEntity> {
    const report = await this.reportRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!report) {
      throw new NotFoundException('Compliance report not found');
    }

    return report;
  }

  // ==================== ACCESS LOG METHODS ====================

  async logAccess(
    userId: string,
    accessType: string,
    resourceType: string,
    resourceId: string,
    result: AccessResult,
    tenantId: string,
    metadata?: any,
  ): Promise<AccessLogEntity> {
    const accessLog = this.accessLogRepo.create({
      user_id: userId,
      access_type: accessType as any,
      resource_type: resourceType,
      resource_id: resourceId,
      result,
      metadata,
      tenant_id: tenantId,
    });

    return this.accessLogRepo.save(accessLog);
  }

  async getAccessLogs(
    tenantId: string,
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AccessLogEntity[]> {
    const where: any = { tenant_id: tenantId };

    if (userId) where.user_id = userId;
    if (startDate && endDate) {
      where.accessed_at = Between(startDate, endDate);
    }

    return this.accessLogRepo.find({
      where,
      relations: ['user'],
      order: { accessed_at: 'DESC' },
      take: 1000,
    });
  }
}
