import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Role } from '../roles/role.entity';
import { UserRole } from '../roles/user-role.entity';
import {
  BillingCycle,
  DEFAULT_PLAN_DEFINITIONS,
  PlanCode,
  PlanFeature,
  PlanLimitKey,
  SubscriptionStatus,
} from './subscription.constants';
import { SelectPlanDto } from './dto/select-plan.dto';
import { CompanySubscription } from './entities/company-subscription.entity';
import { SubscriptionPlanFeature } from './entities/subscription-plan-feature.entity';
import { SubscriptionPlanLimit } from './entities/subscription-plan-limit.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';

type HydratedPlan = SubscriptionPlan & {
  features: SubscriptionPlanFeature[];
  limits: SubscriptionPlanLimit[];
};

type ActiveSubscription = CompanySubscription & {
  plan: HydratedPlan;
};

@Injectable()
export class SubscriptionsService implements OnModuleInit {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(SubscriptionPlanFeature)
    private readonly featureRepository: Repository<SubscriptionPlanFeature>,
    @InjectRepository(SubscriptionPlanLimit)
    private readonly limitRepository: Repository<SubscriptionPlanLimit>,
    @InjectRepository(CompanySubscription)
    private readonly subscriptionRepository: Repository<CompanySubscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPlans();
  }

  async getAvailablePlans() {
    await this.seedDefaultPlans();

    const plans = await this.planRepository.find({
      where: { isActive: true },
      relations: ['features', 'limits'],
      order: { monthlyPrice: 'ASC' },
    });

    return plans.map((plan) => this.mapPlan(plan as HydratedPlan));
  }

  async getCurrentSubscriptionForTenant(tenantId: string) {
    const subscription = await this.getOrCreateCurrentSubscriptionForTenant(
      tenantId,
    );

    return this.mapSubscription(subscription);
  }

  async selectPlan(tenantId: string, dto: SelectPlanDto) {
    await this.seedDefaultPlans();

    const plan = await this.planRepository.findOne({
      where: { code: dto.planCode, isActive: true },
      relations: ['features', 'limits'],
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${dto.planCode} was not found`);
    }

    const current = await this.getActiveSubscriptionRecord(tenantId);
    if (current) {
      current.status = SubscriptionStatus.CANCELED;
      current.endsAt = new Date();
      current.autoRenew = false;
      await this.subscriptionRepository.save(current);
    }

    const nextSubscription = this.subscriptionRepository.create({
      tenantId,
      planId: plan.id,
      billingCycle: dto.billingCycle,
      status: SubscriptionStatus.ACTIVE,
      price:
        dto.billingCycle === BillingCycle.YEARLY
          ? plan.yearlyPrice
          : plan.monthlyPrice,
      startsAt: new Date(),
      endsAt: null,
      autoRenew: dto.autoRenew ?? true,
      metadata: {
        selectedAt: new Date().toISOString(),
        selectedPlanCode: dto.planCode,
      },
    });

    const saved = await this.subscriptionRepository.save(nextSubscription);
    const hydrated = await this.subscriptionRepository.findOne({
      where: { id: saved.id },
      relations: ['plan', 'plan.features', 'plan.limits'],
    });

    if (!hydrated) {
      throw new NotFoundException('Subscription could not be loaded');
    }

    return this.mapSubscription(hydrated as ActiveSubscription);
  }

  async assertSuperAdmin(userId: string, tenantId: string) {
    if (!(await this.isSuperAdminUser(userId, tenantId))) {
      throw new ForbiddenException(
        'Only super admin can change the subscription plan',
      );
    }
  }

  async isSuperAdminUser(userId: string, tenantId: string) {
    const userRoles = await this.userRoleRepository.find({
      where: { user_id: userId },
    });

    if (userRoles.length === 0) {
      return false;
    }

    const roles = await this.roleRepository.find({
      where: userRoles.map((userRole) => ({
        id: userRole.role_id,
        tenant_id: tenantId,
      })),
    });

    return roles.some((role) => this.normalizeRoleName(role.name) === 'superadmin');
  }

  async isAdminOrSuperAdminUser(userId: string, tenantId: string) {
    const userRoles = await this.userRoleRepository.find({
      where: { user_id: userId },
    });

    if (userRoles.length === 0) {
      return false;
    }

    const roles = await this.roleRepository.find({
      where: userRoles.map((userRole) => ({
        id: userRole.role_id,
        tenant_id: tenantId,
      })),
    });

    return roles.some((role) => {
      const normalized = this.normalizeRoleName(role.name);
      return normalized === 'admin' || normalized === 'superadmin';
    });
  }

  async createDefaultSubscriptionForTenant(
    tenantId: string,
    planCode: PlanCode = PlanCode.BASIC,
    billingCycle: BillingCycle = BillingCycle.MONTHLY,
  ) {
    const existing = await this.getActiveSubscriptionRecord(tenantId);
    if (existing) {
      return existing;
    }

    const plan = await this.planRepository.findOne({
      where: { code: planCode, isActive: true },
    });

    if (!plan) {
      throw new NotFoundException(`Default plan ${planCode} was not found`);
    }

    return this.subscriptionRepository.save(
      this.subscriptionRepository.create({
        tenantId,
        planId: plan.id,
        billingCycle,
        status: SubscriptionStatus.ACTIVE,
        price:
          billingCycle === BillingCycle.YEARLY
            ? plan.yearlyPrice
            : plan.monthlyPrice,
        startsAt: new Date(),
        endsAt: null,
        autoRenew: true,
        metadata: {
          provisionedBy: 'default-seed',
          selectedPlanCode: planCode,
        },
      }),
    );
  }

  async hasFeatureAccess(tenantId: string, feature: PlanFeature) {
    const subscription = await this.getOrCreateCurrentSubscriptionForTenant(
      tenantId,
    );

    return subscription.plan.features.some(
      (subscriptionFeature) => subscriptionFeature.key === feature,
    );
  }

  async assertFeatureAccess(tenantId: string, feature: PlanFeature) {
    const hasAccess = await this.hasFeatureAccess(tenantId, feature);
    if (!hasAccess) {
      throw new ForbiddenException(
        `Current subscription does not include the "${feature}" feature`,
      );
    }
  }

  async getLimitValue(tenantId: string, limitKey: PlanLimitKey) {
    const subscription = await this.getOrCreateCurrentSubscriptionForTenant(
      tenantId,
    );
    const planLimit = subscription.plan.limits.find(
      (limit) => limit.key === limitKey,
    );

    return planLimit?.value ?? null;
  }

  async assertWithinLimit(
    tenantId: string,
    limitKey: PlanLimitKey,
    currentValue: number,
    increment = 1,
  ) {
    const limitValue = await this.getLimitValue(tenantId, limitKey);
    if (limitValue === null) {
      return;
    }

    if (currentValue + increment > limitValue) {
      throw new ForbiddenException(
        `Plan limit exceeded for "${limitKey}". Allowed: ${limitValue}`,
      );
    }
  }

  async assertCanAddUser(tenantId: string) {
    const activeUsers = await this.userRepository.count({
      where: {
        tenantId,
        is_active: true,
      },
    });

    await this.assertWithinLimit(tenantId, PlanLimitKey.USERS, activeUsers, 1);
  }

  private async getOrCreateCurrentSubscriptionForTenant(tenantId: string) {
    let subscription = await this.getActiveSubscriptionRecord(tenantId);

    if (!subscription) {
      await this.createDefaultSubscriptionForTenant(tenantId);
      subscription = await this.getActiveSubscriptionRecord(tenantId);
    }

    if (!subscription) {
      throw new NotFoundException(
        `No active subscription found for tenant ${tenantId}`,
      );
    }

    return subscription as ActiveSubscription;
  }

  private async getActiveSubscriptionRecord(tenantId: string) {
    return this.subscriptionRepository.findOne({
      where: {
        tenantId,
        status: In([
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.TRIAL,
          SubscriptionStatus.PAST_DUE,
        ]),
      },
      relations: ['plan', 'plan.features', 'plan.limits'],
      order: { createdAt: 'DESC' },
    });
  }

  private async seedDefaultPlans() {
    for (const definition of DEFAULT_PLAN_DEFINITIONS) {
      let plan = await this.planRepository.findOne({
        where: { code: definition.code },
      });

      if (!plan) {
        plan = this.planRepository.create({
          code: definition.code,
          name: definition.name,
          description: definition.description,
          monthlyPrice: definition.monthlyPrice.toFixed(2),
          yearlyPrice: definition.yearlyPrice.toFixed(2),
          isActive: true,
        });
      } else {
        plan.name = definition.name;
        plan.description = definition.description;
        plan.monthlyPrice = definition.monthlyPrice.toFixed(2);
        plan.yearlyPrice = definition.yearlyPrice.toFixed(2);
        plan.isActive = true;
      }

      const savedPlan = await this.planRepository.save(plan);

      await this.featureRepository.delete({ planId: savedPlan.id });
      await this.limitRepository.delete({ planId: savedPlan.id });

      await this.featureRepository.save(
        definition.features.map((feature) =>
          this.featureRepository.create({
            planId: savedPlan.id,
            key: feature,
          }),
        ),
      );

      await this.limitRepository.save(
        definition.limits.map((limit) =>
          this.limitRepository.create({
            planId: savedPlan.id,
            key: limit.key,
            value: limit.value,
          }),
        ),
      );
    }
  }

  private mapPlan(plan: HydratedPlan) {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      pricing: {
        monthly: Number(plan.monthlyPrice),
        yearly: Number(plan.yearlyPrice),
      },
      features: plan.features.map((feature) => feature.key),
      limits: plan.limits.reduce<Record<string, number | null>>(
        (accumulator, limit) => {
          accumulator[limit.key] = limit.value;
          return accumulator;
        },
        {},
      ),
    };
  }

  private mapSubscription(subscription: ActiveSubscription) {
    return {
      id: subscription.id,
      tenantId: subscription.tenantId,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      price: Number(subscription.price),
      startsAt: subscription.startsAt,
      endsAt: subscription.endsAt,
      autoRenew: subscription.autoRenew,
      plan: this.mapPlan(subscription.plan),
      metadata: subscription.metadata,
    };
  }

  private normalizeRoleName(name: string) {
    return name.trim().toLowerCase().replace(/[\s_-]+/g, '');
  }
}
