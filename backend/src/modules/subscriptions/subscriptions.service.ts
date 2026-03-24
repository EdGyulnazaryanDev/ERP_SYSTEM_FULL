import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UserRole } from '../roles/user-role.entity';
import { Role } from '../roles/role.entity';
import {
  BillingCycle,
  DEFAULT_PLAN_DEFINITIONS,
  PlanCode,
  PlanFeature,
  PlanLimitKey,
  SubscriptionStatus,
} from './subscription.constants';
import { SelectPlanDto } from './dto/select-plan.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
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
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPlans();
  }

  async getAvailablePlans() {
    const plans = await this.planRepository.find({
      where: { isActive: true },
      relations: ['features', 'limits'],
      order: { monthlyPrice: 'ASC' },
    });

    return plans.map((plan) => this.mapPlan(plan as HydratedPlan));
  }

  async getCurrentSubscriptionForTenant(tenantId: string) {
    const subscription = await this.getActiveSubscriptionRecord(tenantId);
    if (!subscription) return null;
    return this.mapSubscription(subscription);
  }

  async selectPlan(tenantId: string, dto: SelectPlanDto) {
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

  // ─── Admin plan CRUD ────────────────────────────────────────────────────────

  async getAllPlansForAdmin() {
    const plans = await this.planRepository.find({
      relations: ['features', 'limits'],
      order: { monthlyPrice: 'ASC' },
    });
    return plans.map((plan) => this.mapPlan(plan as HydratedPlan));
  }

  async createPlan(dto: CreatePlanDto) {
    const plan = this.planRepository.create({
      code: dto.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: dto.name,
      description: dto.description ?? null,
      monthlyPrice: dto.monthlyPrice.toFixed(2),
      yearlyPrice: dto.yearlyPrice.toFixed(2),
      isActive: dto.isActive,
    });

    const savedPlan = await this.planRepository.save(plan);

    await this.featureRepository.save(
      dto.features.map((feature) =>
        this.featureRepository.create({ planId: savedPlan.id, key: feature }),
      ),
    );

    await this.limitRepository.save(
      dto.limits.map((limit) =>
        this.limitRepository.create({
          planId: savedPlan.id,
          key: limit.key,
          value: limit.value,
        }),
      ),
    );

    const hydrated = await this.planRepository.findOne({
      where: { id: savedPlan.id },
      relations: ['features', 'limits'],
    });

    return this.mapPlan(hydrated as HydratedPlan);
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: ['features', 'limits'],
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${id} not found`);
    }

    await this.dataSource.transaction(async (manager) => {
      if (dto.name !== undefined) plan.name = dto.name;
      if (dto.description !== undefined) plan.description = dto.description ?? null;
      if (dto.monthlyPrice !== undefined) plan.monthlyPrice = dto.monthlyPrice.toFixed(2);
      if (dto.yearlyPrice !== undefined) plan.yearlyPrice = dto.yearlyPrice.toFixed(2);
      if (dto.isActive !== undefined) plan.isActive = dto.isActive;

      await manager.save(SubscriptionPlan, plan);

      if (dto.features !== undefined) {
        await manager.delete(SubscriptionPlanFeature, { planId: id });
        if (dto.features.length > 0) {
          await manager.save(
            SubscriptionPlanFeature,
            dto.features.map((feature) =>
              manager.create(SubscriptionPlanFeature, { planId: id, key: feature }),
            ),
          );
        }
      }

      if (dto.limits !== undefined) {
        await manager.delete(SubscriptionPlanLimit, { planId: id });
        if (dto.limits.length > 0) {
          await manager.save(
            SubscriptionPlanLimit,
            dto.limits.map((limit) =>
              manager.create(SubscriptionPlanLimit, {
                planId: id,
                key: limit.key,
                value: limit.value,
              }),
            ),
          );
        }
      }
    });

    const hydrated = await this.planRepository.findOne({
      where: { id },
      relations: ['features', 'limits'],
    });

    return this.mapPlan(hydrated as HydratedPlan);
  }

  async deletePlan(id: string): Promise<void> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Plan ${id} not found`);
    }

    const activeSubscription = await this.subscriptionRepository.findOne({
      where: {
        planId: id,
        status: In([
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.TRIAL,
          SubscriptionStatus.PAST_DUE,
        ]),
      },
    });

    if (activeSubscription) {
      throw new ConflictException('Cannot delete a plan with active subscribers');
    }

    await this.planRepository.remove(plan);
  }

  async setPlanStatus(id: string, isActive: boolean) {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: ['features', 'limits'],
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${id} not found`);
    }

    plan.isActive = isActive;
    await this.planRepository.save(plan);

    return this.mapPlan(plan as HydratedPlan);
  }

  private async getOrCreateCurrentSubscriptionForTenant(tenantId: string) {
    const subscription = await this.getActiveSubscriptionRecord(tenantId);

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
      const exists = await this.planRepository.existsBy({
        code: definition.code,
      });

      if (exists) continue; // skip — never overwrite admin-managed plans

      const plan = this.planRepository.create({
        code: definition.code,
        name: definition.name,
        description: definition.description,
        monthlyPrice: definition.monthlyPrice.toFixed(2),
        yearlyPrice: definition.yearlyPrice.toFixed(2),
        isActive: true,
      });

      const savedPlan = await this.planRepository.save(plan);

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

  async isSuperAdminUser(userId: string, tenantId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId, tenantId } });
    // Global system admin always qualifies
    if (user?.isSystemAdmin) return true;

    // Check if user has a "superadmin" role within this tenant
    const userRoles = await this.userRoleRepository.find({ where: { user_id: userId } });
    if (userRoles.length === 0) return false;

    const roleIds = userRoles.map((ur) => ur.role_id);
    const roles = await this.roleRepository.find({
      where: roleIds.map((id) => ({ id, tenant_id: tenantId })),
    });

    return roles.some((r) => this.normalizeRoleName(r.name) === 'superadmin');
  }

  async isAdminOrSuperAdminUser(userId: string, tenantId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId, tenantId } });
    if (user?.isSystemAdmin) return true;

    const userRoles = await this.userRoleRepository.find({ where: { user_id: userId } });
    if (userRoles.length === 0) return false;

    const roleIds = userRoles.map((ur) => ur.role_id);
    const roles = await this.roleRepository.find({
      where: roleIds.map((id) => ({ id, tenant_id: tenantId })),
    });

    return roles.some((r) => {
      const n = this.normalizeRoleName(r.name);
      return n === 'superadmin' || n === 'admin';
    });
  }

  private normalizeRoleName(name: string): string {
    return name.trim().toLowerCase().replace(/[\s_-]+/g, '');
  }

  async assertSuperAdmin(userId: string, tenantId: string): Promise<void> {
    const ok = await this.isSuperAdminUser(userId, tenantId);
    if (!ok) throw new ForbiddenException('Forbidden: super admin access required');
  }

  async assertAdminOrSuperAdmin(userId: string, tenantId: string, jwtRole?: string): Promise<void> {
    // Fast-path: JWT role already indicates admin/superadmin
    if (jwtRole) {
      const n = jwtRole.trim().toLowerCase().replace(/[\s_-]+/g, '');
      if (n === 'admin' || n === 'superadmin') return;
    }
    const ok = await this.isAdminOrSuperAdminUser(userId, tenantId);
    if (!ok) throw new ForbiddenException('Forbidden: admin access required');
  }

  private mapPlan(plan: HydratedPlan) {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      isActive: plan.isActive,
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
}
