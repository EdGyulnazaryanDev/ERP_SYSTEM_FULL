import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SelectPlanDto } from './dto/select-plan.dto';
import { SubscriptionsService } from './subscriptions.service';

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
  selectPlan(
    @CurrentTenant() tenantId: string,
    @Body() dto: SelectPlanDto,
  ) {
    return this.subscriptionsService.selectPlan(tenantId, dto);
  }
}
