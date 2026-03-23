import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Tenant } from '../tenants/tenant.entity';
import { Role } from '../roles/role.entity';
import { UserRole } from '../roles/user-role.entity';
import { RequireFeatureGuard } from './guards/require-feature.guard';
import { CompanySubscription } from './entities/company-subscription.entity';
import { SubscriptionPlanFeature } from './entities/subscription-plan-feature.entity';
import { SubscriptionPlanLimit } from './entities/subscription-plan-limit.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      User,
      Role,
      UserRole,
      SubscriptionPlan,
      SubscriptionPlanFeature,
      SubscriptionPlanLimit,
      CompanySubscription,
    ]),
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, RequireFeatureGuard],
  exports: [SubscriptionsService, RequireFeatureGuard],
})
export class SubscriptionsModule {}
