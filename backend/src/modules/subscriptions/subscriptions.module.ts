import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Tenant } from '../tenants/tenant.entity';
import { RequireFeatureGuard } from './guards/require-feature.guard';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { CompanySubscription } from './entities/company-subscription.entity';
import { SubscriptionPlanFeature } from './entities/subscription-plan-feature.entity';
import { SubscriptionPlanLimit } from './entities/subscription-plan-limit.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionsController } from './subscriptions.controller';
import { AdminSubscriptionPlansController } from './admin-subscription-plans.controller';
import { SubscriptionsService } from './subscriptions.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      User,
      SubscriptionPlan,
      SubscriptionPlanFeature,
      SubscriptionPlanLimit,
      CompanySubscription,
    ]),
  ],
  controllers: [SubscriptionsController, AdminSubscriptionPlansController],
  providers: [SubscriptionsService, RequireFeatureGuard, SystemAdminGuard],
  exports: [SubscriptionsService, RequireFeatureGuard],
})
export class SubscriptionsModule {}
