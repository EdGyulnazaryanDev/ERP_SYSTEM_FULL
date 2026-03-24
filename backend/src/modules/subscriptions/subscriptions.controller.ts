import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SelectPlanDto } from './dto/select-plan.dto';
import { SubscriptionsService } from './subscriptions.service';
import type { JwtUser } from '../../types/express';

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  getPlans() {
    return this.subscriptionsService.getAvailablePlans();
  }

  @Get('current')
  getCurrentSubscription(@CurrentTenant() tenantId: string) {
    return this.subscriptionsService.getCurrentSubscriptionForTenant(tenantId);
  }

  @Post('select-plan')
  async selectPlan(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: SelectPlanDto,
  ) {
    await this.subscriptionsService.assertAdminOrSuperAdmin(user.sub, tenantId, user.role);
    return this.subscriptionsService.selectPlan(tenantId, dto);
  }
}
