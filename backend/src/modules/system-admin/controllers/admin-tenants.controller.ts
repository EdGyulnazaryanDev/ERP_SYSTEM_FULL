import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../../../common/guards/system-admin.guard';
import { Tenant } from '../../tenants/tenant.entity';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { ComplianceAuditService } from '../../compliance-audit/compliance-audit.service';
import { AuditAction, AuditSeverity } from '../../compliance-audit/entities/audit-log.entity';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../../types/express';

@Controller('admin/tenants')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
export class AdminTenantsController {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly complianceAuditService: ComplianceAuditService,
  ) {}

  @Get()
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('name') name?: string,
    @Query('isActive') isActive?: string,
  ) {
    const where: any = {};
    if (name) where.name = ILike(`%${name}%`);
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [tenants, total] = await this.tenantRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const results = await Promise.all(
      tenants.map(async (t) => {
        let planName: string | null = null;
        try {
          const sub = await this.subscriptionsService.getCurrentSubscriptionForTenant(t.id);
          planName = sub?.plan?.name ?? null;
        } catch {
          planName = null;
        }
        return {
          id: t.id,
          name: t.name,
          domain: t.domain,
          isActive: t.isActive,
          createdAt: t.createdAt,
          planName,
        };
      }),
    );

    return { data: results, total, page: Number(page), limit: Number(limit) };
  }

  @Post()
  async create(
    @Body() body: { name: string; domain?: string },
    @CurrentUser() user: JwtUser,
  ) {
    const tenant = await this.tenantRepo.save(
      this.tenantRepo.create({ name: body.name, domain: body.domain }),
    );

    await this.complianceAuditService.createAuditLog(
      { action: AuditAction.CREATE, entity_type: 'tenant', entity_id: tenant.id, description: `Created tenant "${tenant.name}"`, severity: AuditSeverity.LOW },
      null, 'system',
    );

    return tenant;
  }

  // Specific sub-routes MUST come before the generic :id route to avoid route shadowing
  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (!tenant.isActive) throw new ConflictException('Tenant is already inactive');

    tenant.isActive = false;
    await this.tenantRepo.save(tenant);

    await this.complianceAuditService.createAuditLog(
      { action: AuditAction.UPDATE, entity_type: 'tenant', entity_id: id, description: `Deactivated tenant "${tenant.name}"`, severity: AuditSeverity.MEDIUM },
      null, 'system',
    );

    return { message: 'Tenant deactivated', id };
  }

  @Patch(':id/activate')
  async activate(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.isActive) throw new ConflictException('Tenant is already active');

    tenant.isActive = true;
    await this.tenantRepo.save(tenant);

    await this.complianceAuditService.createAuditLog(
      { action: AuditAction.UPDATE, entity_type: 'tenant', entity_id: id, description: `Activated tenant "${tenant.name}"`, severity: AuditSeverity.LOW },
      null, 'system',
    );

    return { message: 'Tenant activated', id };
  }

  @Delete(':id')
  async deleteTenant(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    await this.complianceAuditService.createAuditLog(
      { action: AuditAction.DELETE, entity_type: 'tenant', entity_id: id, description: `Deleted tenant "${tenant.name}" and all related data`, severity: AuditSeverity.HIGH },
      null, 'system',
    );

    // Delete the tenant - cascade deletes will handle related data
    await this.tenantRepo.remove(tenant);

    return { message: 'Tenant and all related data deleted', id };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; domain?: string },
    @CurrentUser() user: JwtUser,
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (body.name) tenant.name = body.name;
    if (body.domain !== undefined) tenant.domain = body.domain ?? null;
    await this.tenantRepo.save(tenant);

    await this.complianceAuditService.createAuditLog(
      { action: AuditAction.UPDATE, entity_type: 'tenant', entity_id: id, description: `Updated tenant "${tenant.name}"`, severity: AuditSeverity.LOW },
      null, 'system',
    );

    return tenant;
  }
}
