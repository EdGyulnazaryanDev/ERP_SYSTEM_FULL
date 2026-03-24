import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { User } from '../../users/user.entity';
import { Role } from '../../roles/role.entity';
import { UserRole } from '../../roles/user-role.entity';
import { CustomerEntity } from '../../crm/entities/customer.entity';
import { ActivityEntity } from '../../crm/entities/activity.entity';
import { QuoteEntity } from '../../crm/entities/quote.entity';
import { SupplierEntity } from '../../suppliers/supplier.entity';
import { PortalAccountEntity } from '../entities/portal-account.entity';
import { TransactionEntity } from '../../transactions/entities/transaction.entity';
import { ShipmentEntity } from '../../transportation/entities/shipment.entity';
import { AccountReceivableEntity } from '../../accounting/entities/account-receivable.entity';
import { AccountPayableEntity } from '../../accounting/entities/account-payable.entity';
import { DefaultRbacSeeder } from '../../../database/seeders/default-rbac.seeder';
import { ComplianceAuditService } from '../../compliance-audit/compliance-audit.service';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';

const makeRepoMock = () => ({
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  existsBy: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Tenant), useValue: makeRepoMock() },
        { provide: getRepositoryToken(User), useValue: makeRepoMock() },
        { provide: getRepositoryToken(Role), useValue: makeRepoMock() },
        { provide: getRepositoryToken(UserRole), useValue: makeRepoMock() },
        { provide: getRepositoryToken(CustomerEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(ActivityEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(QuoteEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(SupplierEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(PortalAccountEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(TransactionEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(ShipmentEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(AccountReceivableEntity), useValue: makeRepoMock() },
        { provide: getRepositoryToken(AccountPayableEntity), useValue: makeRepoMock() },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn(), verify: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(), getOrThrow: jest.fn() },
        },
        {
          provide: DefaultRbacSeeder,
          useValue: { seed: jest.fn(), getDefaultAdminRole: jest.fn() },
        },
        {
          provide: ComplianceAuditService,
          useValue: { createAuditLog: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: SubscriptionsService,
          useValue: { createDefaultSubscriptionForTenant: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
