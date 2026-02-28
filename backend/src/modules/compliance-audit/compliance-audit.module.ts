import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceAuditController } from './compliance-audit.controller';
import { ComplianceAuditService } from './compliance-audit.service';
import { AuditLogEntity } from './entities/audit-log.entity';
import { ComplianceRuleEntity } from './entities/compliance-rule.entity';
import { ComplianceCheckEntity } from './entities/compliance-check.entity';
import { DataRetentionPolicyEntity } from './entities/data-retention-policy.entity';
import { ComplianceReportEntity } from './entities/compliance-report.entity';
import { AccessLogEntity } from './entities/access-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLogEntity,
      ComplianceRuleEntity,
      ComplianceCheckEntity,
      DataRetentionPolicyEntity,
      ComplianceReportEntity,
      AccessLogEntity,
    ]),
  ],
  controllers: [ComplianceAuditController],
  providers: [ComplianceAuditService],
  exports: [ComplianceAuditService],
})
export class ComplianceAuditModule {}
