import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../../../common/guards/system-admin.guard';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { ComplianceAuditService } from '../../compliance-audit/compliance-audit.service';
import { AuditAction, AuditSeverity } from '../../compliance-audit/entities/audit-log.entity';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../../types/express';
import type { BillingCycle } from '../../subscriptions/subscription.constants';

@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
export class AdminSubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly complianceAuditService: ComplianceAuditService,
  ) {}

  @Patch('tenants/:tenantId/plan')
  async assignPlan(
    @Param('tenantId') tenantId: string,
    @Body() body: { planCode: string; billingCycle: BillingCycle; autoRenew?: boolean },
    @CurrentUser() user: JwtUser,
  ) {
    const result = await this.subscriptionsService.selectPlan(tenantId, {
      planCode: body.planCode as any,
      billingCycle: body.billingCycle,
      autoRenew: body.autoRenew,
    });

    await this.complianceAuditService.createAuditLog(
      {
        action: AuditAction.UPDATE,
        entity_type: 'subscription',
        entity_id: tenantId,
        description: `Assigned plan "${body.planCode}" to tenant ${tenantId}`,
        severity: AuditSeverity.LOW,
      },
      null,
      'system',
    );

    return result;
  }
}
