import { ObjectLiteral, Repository } from 'typeorm';

export abstract class BaseTenantService<T extends ObjectLiteral> {
  protected constructor(protected readonly repository: Repository<T>) {}

  protected findAllByTenant(tenantId: string) {
    return this.repository.find({
      where: { tenant: { id: tenantId } } as any,
    });
  }

  protected findOneByTenant(id: string, tenantId: string) {
    return this.repository.findOne({
      where: { id, tenant: { id: tenantId } } as any,
    });
  }
}
