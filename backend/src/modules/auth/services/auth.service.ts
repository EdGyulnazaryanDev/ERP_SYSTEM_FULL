import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { User } from '../../users/user.entity';
import { Role } from '../../roles/role.entity';
import { UserRole } from '../../roles/user-role.entity';
import { CustomerEntity, CustomerStatus } from '../../crm/entities/customer.entity';
import { ActivityEntity, ActivityStatus, RelatedToType } from '../../crm/entities/activity.entity';
import { QuoteEntity, QuoteStatus } from '../../crm/entities/quote.entity';
import { SupplierEntity } from '../../suppliers/supplier.entity';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ActivatePortalAccountDto } from '../dto/activate-portal-account.dto';
import { SetPortalCredentialsDto } from '../dto/set-portal-credentials.dto';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { DefaultRbacSeeder } from '../../../database/seeders/default-rbac.seeder';
import { ComplianceAuditService } from '../../compliance-audit/compliance-audit.service';
import { AuditAction, AuditSeverity } from '../../compliance-audit/entities/audit-log.entity';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { PortalAccountEntity, PortalActorType } from '../entities/portal-account.entity';
import {
  TransactionEntity,
  TransactionStatus,
  TransactionType,
} from '../../transactions/entities/transaction.entity';
import { ShipmentEntity, ShipmentStatus } from '../../transportation/entities/shipment.entity';
import { AccountReceivableEntity, ARStatus } from '../../accounting/entities/account-receivable.entity';
import { AccountPayableEntity, APStatus } from '../../accounting/entities/account-payable.entity';
import type { JwtUser } from '../../../types/express';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Role)
    private roleRepo: Repository<Role>,

    @InjectRepository(UserRole)
    private userRoleRepo: Repository<UserRole>,

    @InjectRepository(CustomerEntity)
    private customerRepo: Repository<CustomerEntity>,

    @InjectRepository(ActivityEntity)
    private activityRepo: Repository<ActivityEntity>,

    @InjectRepository(QuoteEntity)
    private quoteRepo: Repository<QuoteEntity>,

    @InjectRepository(SupplierEntity)
    private supplierRepo: Repository<SupplierEntity>,

    @InjectRepository(PortalAccountEntity)
    private portalAccountRepo: Repository<PortalAccountEntity>,

    @InjectRepository(TransactionEntity)
    private transactionRepo: Repository<TransactionEntity>,

    @InjectRepository(ShipmentEntity)
    private shipmentRepo: Repository<ShipmentEntity>,

    @InjectRepository(AccountReceivableEntity)
    private accountReceivableRepo: Repository<AccountReceivableEntity>,

    @InjectRepository(AccountPayableEntity)
    private accountPayableRepo: Repository<AccountPayableEntity>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly rbacSeeder: DefaultRbacSeeder,
    private readonly subscriptionsService: SubscriptionsService,
    @Optional()
    private readonly complianceAuditService?: ComplianceAuditService,
  ) {}

  async login(dto: LoginDto) {
    if (dto.actorType && dto.actorType !== 'staff') {
      return this.loginPortal(dto);
    }

    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    if (!user) throw new UnauthorizedException();

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      await this.complianceAuditService?.createAuditLog(
        {
          action: AuditAction.LOGIN,
          entity_type: 'auth',
          entity_id: user.id,
          description: 'Failed login attempt (invalid password)',
          severity: AuditSeverity.MEDIUM,
        },
        user.id,
        user.tenantId,
      );
      throw new UnauthorizedException();
    }

    await this.complianceAuditService?.createAuditLog(
      {
        action: AuditAction.LOGIN,
        entity_type: 'auth',
        entity_id: user.id,
        description: 'Successful login',
        severity: AuditSeverity.LOW,
      },
      user.id,
      user.tenantId,
    );

    const tokens = await this.generateTokens(
      user.id,
      user.tenantId,
      user.email,
      'staff',
      user.id,
      'user',
      [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email,
      user.isSystemAdmin,
    );

    await this.updateRefreshToken('staff', user.id, tokens.refreshToken);

    return tokens;
  }

  async activatePortalAccount(dto: ActivatePortalAccountDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new UnauthorizedException('Passwords do not match');
    }

    const email = dto.email.trim().toLowerCase();
    const { actorId, tenantId, displayName } = await this.resolvePortalActor(
      dto.actorType,
      email,
    );

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    let portalAccount = await this.portalAccountRepo.findOne({
      where: {
        actor_type: dto.actorType,
        actor_id: actorId,
      },
    });

    if (!portalAccount) {
      portalAccount = this.portalAccountRepo.create({
        tenant_id: tenantId,
        actor_type: dto.actorType,
        actor_id: actorId,
        email,
        display_name: displayName,
        password: hashedPassword,
        is_active: true,
      });
    } else {
      portalAccount.email = email;
      portalAccount.display_name = displayName;
      portalAccount.password = hashedPassword;
      portalAccount.is_active = true;
    }

    await this.portalAccountRepo.save(portalAccount);

    const tokens = await this.generateTokens(
      portalAccount.id,
      tenantId,
      email,
      dto.actorType,
      actorId,
      dto.actorType,
      displayName,
    );

    await this.updateRefreshToken('portal', portalAccount.id, tokens.refreshToken);

    return tokens;
  }

  async setPortalCredentials(dto: SetPortalCredentialsDto, tenantId: string) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const actor = await this.resolvePortalActorById(dto.actorType, dto.actorId, tenantId);
    const email = dto.email.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const existingEmailOwner = await this.portalAccountRepo.findOne({
      where: { actor_type: dto.actorType, email },
    });

    if (existingEmailOwner && existingEmailOwner.actor_id !== actor.actorId) {
      throw new ConflictException('Email is already assigned to another portal account');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const displayName = actor.displayName || email;

    let portalAccount = await this.portalAccountRepo.findOne({
      where: {
        actor_type: dto.actorType,
        actor_id: actor.actorId,
      },
    });

    if (!portalAccount) {
      portalAccount = this.portalAccountRepo.create({
        tenant_id: tenantId,
        actor_type: dto.actorType,
        actor_id: actor.actorId,
        email,
        display_name: displayName,
        password: hashedPassword,
        is_active: true,
      });
    } else {
      portalAccount.email = email;
      portalAccount.display_name = displayName;
      portalAccount.password = hashedPassword;
      portalAccount.is_active = true;
    }

    await this.portalAccountRepo.save(portalAccount);

    return { message: 'Portal credentials saved' };
  }

  async register(dto: RegisterDto) {
    const hashedPassword: string = await bcrypt.hash(dto.password, 10);

    const tenant: Tenant = await this.tenantRepo.save({
      name: dto.companyName,
    });

    await this.subscriptionsService.createDefaultSubscriptionForTenant(tenant.id);

    // Seed default RBAC for new tenant
    await this.rbacSeeder.seed(tenant.id);

    // Get default Admin role
    const adminRole = await this.rbacSeeder.getDefaultAdminRole(tenant.id);

    if (!adminRole) {
      throw new Error('Failed to create default admin role');
    }

    const user: User = await this.userRepo.save({
      email: dto.email,
      password: hashedPassword,
      first_name: dto.firstName,
      last_name: dto.lastName,
      tenantId: tenant.id,
    });

    // Assign admin role to first user
    await this.userRoleRepo.save({
      user_id: user.id,
      role_id: adminRole.id,
    });

    const tokens = await this.generateTokens(
      user.id,
      tenant.id,
      user.email,
      'staff',
      user.id,
      'admin',
      [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email,
    );

    await this.updateRefreshToken('staff', user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, tenantId: string) {
    const portalAccount = await this.portalAccountRepo.findOne({
      where: { id: userId },
    });

    if (portalAccount) {
      await this.portalAccountRepo.update(userId, {
        refreshToken: null,
      });
    } else {
      await this.userRepo.update(userId, {
        refreshToken: null,
      });
    }

    await this.complianceAuditService?.createAuditLog(
      {
        action: AuditAction.LOGOUT,
        entity_type: 'auth',
        entity_id: userId,
        description: 'User logged out',
        severity: AuditSeverity.LOW,
      },
      userId,
      tenantId,
    );

    return { message: 'Logged out successfully' };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
      });
      if (payload.actorType === 'staff') {
        if (!user || !user.refreshToken) {
          throw new UnauthorizedException();
        }

        const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
        if (!isMatch) {
          throw new UnauthorizedException();
        }

        const tokens = await this.generateTokens(
          user.id,
          user.tenantId,
          user.email,
          'staff',
          user.id,
          payload.role ?? 'user',
          payload.name,
        );

        await this.updateRefreshToken('staff', user.id, tokens.refreshToken);
        return tokens;
      }

      const portalAccount = await this.portalAccountRepo.findOne({
        where: { id: payload.sub },
      });

      if (!portalAccount || !portalAccount.refreshToken) {
        throw new UnauthorizedException();
      }

      const isMatch = await bcrypt.compare(refreshToken, portalAccount.refreshToken);
      if (!isMatch) {
        throw new UnauthorizedException();
      }

      const tokens = await this.generateTokens(
        portalAccount.id,
        portalAccount.tenant_id,
        portalAccount.email,
        payload.actorType,
        payload.principalId,
        payload.role,
        portalAccount.display_name,
      );

      await this.updateRefreshToken('portal', portalAccount.id, tokens.refreshToken);
      return tokens;
    } catch {
      throw new UnauthorizedException();
    }
  }

  async getPortalSummary(user: JwtUser) {
    if (user.actorType === 'staff') {
      throw new BadRequestException('Portal summary is available only for customer and supplier accounts');
    }

    if (user.actorType === 'customer') {
      return this.getCustomerPortalSummary(user);
    }

    return this.getSupplierPortalSummary(user);
  }

  private async generateTokens(
    userId: string,
    tenantId: string,
    email: string,
    actorType: 'staff' | 'customer' | 'supplier',
    principalId: string,
    role?: string,
    name?: string,
    isSystemAdmin?: boolean,
  ) {
    const payload: JwtPayload = {
      sub: userId,
      tenantId,
      email,
      actorType,
      principalId,
      role,
      name,
      isSystemAdmin,
    };

    const accessSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const accessExpires = this.configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    );

    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const refreshExpires = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );

    console.log('🔑 JWT Config:', {
      accessExpires,
      refreshExpires,
    });

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpires as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpires as any,
    });

    return { accessToken, refreshToken };
  }
  async quickTestLogin() {
    // For testing - get first user and generate tokens
    const user = await this.userRepo.findOne({
      where: {},
    });

    if (!user) {
      throw new Error(
        'No test user found. Please create a user first via registration.',
      );
    }

    const tokens = await this.generateTokens(
      user.id,
      user.tenantId,
      user.email,
      'staff',
      user.id,
      'user',
      [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email,
    );

    await this.updateRefreshToken('staff', user.id, tokens.refreshToken);

    return tokens;
  }

  private async updateRefreshToken(
    accountType: 'staff' | 'portal',
    userId: string,
    refreshToken: string,
  ) {
    const hashed = await bcrypt.hash(refreshToken, 10);

    if (accountType === 'portal') {
      await this.portalAccountRepo.update(userId, {
        refreshToken: hashed,
      });
      return;
    }

    await this.userRepo.update(userId, {
      refreshToken: hashed,
    });
  }

  private async loginPortal(dto: LoginDto) {
    const actorType = dto.actorType as PortalActorType;
    const portalAccount = await this.portalAccountRepo.findOne({
      where: {
        actor_type: actorType,
        email: dto.email.trim().toLowerCase(),
        is_active: true,
      },
    });

    if (!portalAccount) {
      throw new UnauthorizedException('Portal account is not activated');
    }

    const isMatch = await bcrypt.compare(dto.password, portalAccount.password);
    if (!isMatch) {
      throw new UnauthorizedException();
    }

    const tokens = await this.generateTokens(
      portalAccount.id,
      portalAccount.tenant_id,
      portalAccount.email,
      actorType,
      portalAccount.actor_id,
      actorType,
      portalAccount.display_name,
    );

    await this.updateRefreshToken('portal', portalAccount.id, tokens.refreshToken);
    return tokens;
  }

  private async getCustomerPortalSummary(user: JwtUser) {
    const customer = await this.customerRepo.findOne({
      where: { id: user.principalId, tenant_id: user.tenantId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const [transactions, receivables, activities, quotes] = await Promise.all([
      this.transactionRepo.find({
        where: {
          tenant_id: user.tenantId,
          customer_id: customer.id,
          type: TransactionType.SALE,
        },
        relations: ['items'],
        order: { transaction_date: 'DESC', created_at: 'DESC' },
      }),
      this.accountReceivableRepo.find({
        where: {
          tenant_id: user.tenantId,
          customer_id: customer.id,
        },
        order: { due_date: 'ASC', created_at: 'DESC' },
      }),
      this.activityRepo.find({
        where: {
          tenant_id: user.tenantId,
          related_to: RelatedToType.CUSTOMER,
          related_id: customer.id,
        },
        order: { start_date_time: 'DESC', created_at: 'DESC' },
        take: 6,
      }),
      this.quoteRepo.find({
        where: {
          tenant_id: user.tenantId,
          customer_id: customer.id,
        },
        relations: ['items'],
        order: { quote_date: 'DESC', created_at: 'DESC' },
        take: 6,
      }),
    ]);

    const transactionIds = transactions.map((transaction) => transaction.id);
    const shipments = transactionIds.length
      ? await this.shipmentRepo.find({
          where: {
            tenant_id: user.tenantId,
            transaction_id: In(transactionIds),
          },
          relations: ['items', 'courier'],
          order: { created_at: 'DESC' },
        })
      : [];

    const now = new Date();
    const activeShipmentStatuses = [
      ShipmentStatus.PENDING,
      ShipmentStatus.PICKED_UP,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.OUT_FOR_DELIVERY,
    ];
    const openInvoiceStatuses = [
      ARStatus.OPEN,
      ARStatus.PARTIALLY_PAID,
      ARStatus.OVERDUE,
    ];
    const activeShipments = shipments.filter((shipment) =>
      activeShipmentStatuses.includes(shipment.status),
    );
    const deliveredShipments = shipments.filter(
      (shipment) => shipment.status === ShipmentStatus.DELIVERED,
    );
    const openOrders = transactions.filter((transaction) =>
      [TransactionStatus.DRAFT, TransactionStatus.PENDING].includes(
        transaction.status,
      ),
    );
    const completedOrders = transactions.filter(
      (transaction) => transaction.status === TransactionStatus.COMPLETED,
    );
    const openReceivables = receivables.filter((receivable) =>
      openInvoiceStatuses.includes(receivable.status),
    );
    const overdueReceivables = receivables.filter((receivable) => {
      const dueDate = receivable.due_date ? new Date(receivable.due_date) : null;
      return (
        receivable.status === ARStatus.OVERDUE ||
        (Number(receivable.balance_amount || 0) > 0 &&
          dueDate !== null &&
          dueDate.getTime() < now.getTime() &&
          receivable.status !== ARStatus.PAID)
      );
    });

    const outstandingBalance = this.sumAmounts(
      receivables.map((receivable) => receivable.balance_amount),
    );
    const lifetimeRevenue = this.sumAmounts(
      transactions.map((transaction) => transaction.total_amount),
    );
    const averageOrderValue =
      transactions.length > 0 ? lifetimeRevenue / transactions.length : 0;
    const onTimeEligible = deliveredShipments.filter(
      (shipment) =>
        shipment.estimated_delivery_date && shipment.actual_delivery_date,
    );
    const onTimeDelivered = onTimeEligible.filter(
      (shipment) =>
        new Date(shipment.actual_delivery_date).getTime() <=
        new Date(shipment.estimated_delivery_date as Date).getTime(),
    );
    const onTimeDeliveryRate =
      onTimeEligible.length > 0
        ? (onTimeDelivered.length / onTimeEligible.length) * 100
        : null;

    const heroStats = [
      {
        label: 'Open orders',
        value: openOrders.length,
        hint: `${completedOrders.length} completed sales orders on file`,
      },
      {
        label: 'Invoices due',
        value: openReceivables.length,
        hint: `${overdueReceivables.length} overdue or escalation candidates`,
      },
      {
        label: 'Shipments active',
        value: activeShipments.length,
        hint: `${deliveredShipments.length} delivered shipment records`,
      },
      {
        label: 'Open quotes',
        value: quotes.filter((quote) =>
          [QuoteStatus.DRAFT, QuoteStatus.SENT].includes(quote.status),
        ).length,
        hint: `${quotes.filter((quote) => quote.status === QuoteStatus.ACCEPTED).length} accepted commercial offers`,
      },
    ];

    const kpis = [
      {
        key: 'creditAvailable',
        label: 'Credit available',
        value: Math.max(Number(customer.credit_limit || 0) - outstandingBalance, 0),
      },
      {
        key: 'outstanding',
        label: 'Outstanding balance',
        value: outstandingBalance,
      },
      {
        key: 'lifetimeRevenue',
        label: 'Lifetime sales',
        value: lifetimeRevenue,
      },
      {
        key: 'onTimeDeliveryRate',
        label: 'On-time delivery',
        value: onTimeDeliveryRate,
      },
    ];

    const timeline = [
      ...transactions.slice(0, 4).map((transaction) => ({
        date: transaction.updated_at || transaction.transaction_date,
        title: `Order ${transaction.transaction_number}`,
        text: `${this.toTitleCase(transaction.status)} sales transaction for ${this.formatMoney(Number(transaction.total_amount || 0))}.`,
      })),
      ...shipments.slice(0, 4).map((shipment) => ({
        date: shipment.actual_delivery_date || shipment.updated_at || shipment.created_at,
        title: `Shipment ${shipment.tracking_number}`,
        text: `${this.toTitleCase(shipment.status)} shipment to ${shipment.destination_city || shipment.destination_name}.`,
      })),
      ...receivables.slice(0, 4).map((receivable) => ({
        date: receivable.updated_at || receivable.invoice_date,
        title: `Invoice ${receivable.invoice_number}`,
        text: `${this.toTitleCase(receivable.status)} receivable with ${this.formatMoney(Number(receivable.balance_amount || 0))} outstanding.`,
      })),
      ...quotes.slice(0, 3).map((quote) => ({
        date: quote.updated_at || quote.quote_date,
        title: `Quote ${quote.quote_number}`,
        text: `${this.toTitleCase(quote.status)} quote worth ${this.formatMoney(Number(quote.total_amount || 0))}.`,
      })),
      ...activities.slice(0, 3).map((activity) => ({
        date: activity.start_date_time || activity.updated_at || activity.created_at,
        title: `${this.toTitleCase(activity.activity_type)}: ${activity.subject}`,
        text: `${this.toTitleCase(activity.status)} CRM activity${activity.next_action ? `, next action: ${activity.next_action}` : ''}.`,
      })),
    ]
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 8);

    return {
      actorType: 'customer' as const,
      generatedAt: new Date().toISOString(),
      customer: {
        id: customer.id,
        customerCode: customer.customer_code,
        companyName: customer.company_name,
        contactPerson: customer.contact_person,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        country: customer.country,
        status: customer.status,
        paymentTerms: customer.payment_terms,
        creditLimit: Number(customer.credit_limit || 0),
      },
      heroStats,
      kpis,
      analytics: {
        totalOrders: transactions.length,
        openOrders: openOrders.length,
        completedOrders: completedOrders.length,
        activeShipments: activeShipments.length,
        deliveredShipments: deliveredShipments.length,
        totalInvoices: receivables.length,
        outstandingBalance,
        overdueInvoices: overdueReceivables.length,
        lifetimeRevenue,
        averageOrderValue,
        onTimeDeliveryRate,
      },
      accountContext: [
        { label: 'Customer code', value: customer.customer_code },
        { label: 'Account owner', value: customer.contact_person || customer.company_name },
        { label: 'Portal email', value: customer.email },
        { label: 'Payment terms', value: `${customer.payment_terms} days` },
        { label: 'Credit limit', value: this.formatMoney(Number(customer.credit_limit || 0)) },
        {
          label: 'Territory',
          value: [customer.city, customer.country].filter(Boolean).join(', ') || 'Not specified',
        },
      ],
      actionCards: [
        {
          title: 'Order execution',
          text: `You currently have ${openOrders.length} open sales orders and ${activeShipments.length} active shipment movements.`,
          tags: [
            `${transactions.length} total orders`,
            `${activeShipments.length} shipping now`,
            `${deliveredShipments.length} delivered`,
          ],
        },
        {
          title: 'Billing and exposure',
          text: `${openReceivables.length} receivables remain open with ${this.formatMoney(outstandingBalance)} still outstanding.`,
          tags: [
            `${overdueReceivables.length} overdue`,
            `${this.formatMoney(Math.max(Number(customer.credit_limit || 0) - outstandingBalance, 0))} credit left`,
          ],
        },
        {
          title: 'Commercial pipeline',
          text: `${quotes.length} recent quotes and ${activities.length} CRM activities are linked to this customer account.`,
          tags: [
            `${quotes.filter((quote) => quote.status === QuoteStatus.SENT).length} quotes sent`,
            `${activities.filter((activity) => activity.status !== ActivityStatus.COMPLETED).length} CRM actions open`,
          ],
        },
      ],
      recentOrders: transactions.slice(0, 5).map((transaction) => ({
        id: transaction.id,
        number: transaction.transaction_number,
        status: transaction.status,
        date: transaction.transaction_date,
        totalAmount: Number(transaction.total_amount || 0),
        balanceAmount: Number(transaction.balance_amount || 0),
        itemCount: transaction.items?.length || 0,
      })),
      recentShipments: shipments.slice(0, 5).map((shipment) => ({
        id: shipment.id,
        trackingNumber: shipment.tracking_number,
        status: shipment.status,
        destinationName: shipment.destination_name,
        destinationCity: shipment.destination_city,
        estimatedDeliveryDate: shipment.estimated_delivery_date,
        actualDeliveryDate: shipment.actual_delivery_date,
        updatedAt: shipment.updated_at,
      })),
      receivables: receivables.slice(0, 5).map((receivable) => ({
        id: receivable.id,
        invoiceNumber: receivable.invoice_number,
        status: receivable.status,
        invoiceDate: receivable.invoice_date,
        dueDate: receivable.due_date,
        totalAmount: Number(receivable.total_amount || 0),
        balanceAmount: Number(receivable.balance_amount || 0),
      })),
      quotes: quotes.slice(0, 5).map((quote) => ({
        id: quote.id,
        quoteNumber: quote.quote_number,
        status: quote.status,
        quoteDate: quote.quote_date,
        validUntil: quote.valid_until,
        totalAmount: Number(quote.total_amount || 0),
      })),
      activities: activities.map((activity) => ({
        id: activity.id,
        type: activity.activity_type,
        status: activity.status,
        subject: activity.subject,
        startDateTime: activity.start_date_time,
        nextAction: activity.next_action,
      })),
      timeline,
    };
  }

  private async getSupplierPortalSummary(user: JwtUser) {
    const supplier = await this.supplierRepo.findOne({
      where: { id: user.principalId, tenant_id: user.tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const [transactions, payables] = await Promise.all([
      this.transactionRepo.find({
        where: {
          tenant_id: user.tenantId,
          supplier_id: supplier.id,
          type: TransactionType.PURCHASE,
        },
        relations: ['items'],
        order: { transaction_date: 'DESC', created_at: 'DESC' },
      }),
      this.accountPayableRepo.find({
        where: {
          tenant_id: user.tenantId,
          vendor_id: supplier.id,
        },
        order: { due_date: 'ASC', created_at: 'DESC' },
      }),
    ]);

    const transactionIds = transactions.map((transaction) => transaction.id);
    const shipments = transactionIds.length
      ? await this.shipmentRepo.find({
          where: {
            tenant_id: user.tenantId,
            transaction_id: In(transactionIds),
          },
          relations: ['items', 'courier'],
          order: { created_at: 'DESC' },
        })
      : [];

    const outstandingBalance = this.sumAmounts(
      payables.map((payable) => payable.balance_amount),
    );

    return {
      actorType: 'supplier' as const,
      generatedAt: new Date().toISOString(),
      supplier: {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        city: supplier.city,
        country: supplier.country,
      },
      heroStats: [
        {
          label: 'Open POs',
          value: transactions.filter((transaction) =>
            [TransactionStatus.DRAFT, TransactionStatus.PENDING].includes(transaction.status),
          ).length,
          hint: `${transactions.length} purchase transactions on file`,
        },
        {
          label: 'Inbound shipments',
          value: shipments.filter((shipment) => shipment.status !== ShipmentStatus.DELIVERED).length,
          hint: `${shipments.filter((shipment) => shipment.status === ShipmentStatus.DELIVERED).length} already delivered`,
        },
        {
          label: 'Bills pending',
          value: payables.filter((payable) =>
            [APStatus.OPEN, APStatus.PARTIALLY_PAID, APStatus.OVERDUE].includes(payable.status),
          ).length,
          hint: `${this.formatMoney(outstandingBalance)} outstanding`,
        },
        {
          label: 'Supplier status',
          value: supplier.is_active ? 'Active' : 'Inactive',
          hint: [supplier.city, supplier.country].filter(Boolean).join(', ') || 'No territory set',
        },
      ],
      kpis: [
        {
          key: 'purchaseValue',
          label: 'Purchase value',
          value: this.sumAmounts(transactions.map((transaction) => transaction.total_amount)),
        },
        {
          key: 'pendingBills',
          label: 'Outstanding AP',
          value: outstandingBalance,
        },
        {
          key: 'shipments',
          label: 'Shipment records',
          value: shipments.length,
        },
        {
          key: 'activePurchaseOrders',
          label: 'Active purchase orders',
          value: transactions.filter((transaction) => transaction.status !== TransactionStatus.CANCELLED).length,
        },
      ],
      accountContext: [
        { label: 'Supplier', value: supplier.name },
        { label: 'Portal email', value: supplier.email || user.email },
        { label: 'Phone', value: supplier.phone || 'Not specified' },
        { label: 'Territory', value: [supplier.city, supplier.country].filter(Boolean).join(', ') || 'Not specified' },
      ],
      actionCards: [
        {
          title: 'Purchase flow',
          text: `${transactions.length} purchase transactions are currently linked to this supplier account.`,
          tags: [`${shipments.length} shipments`, `${payables.length} AP records`],
        },
        {
          title: 'Financial exposure',
          text: `${this.formatMoney(outstandingBalance)} is still pending across open supplier bills.`,
          tags: [`${payables.filter((payable) => payable.status === APStatus.OVERDUE).length} overdue`, `${payables.filter((payable) => payable.status === APStatus.PAID).length} paid`],
        },
      ],
      recentShipments: shipments.slice(0, 5).map((shipment) => ({
        id: shipment.id,
        trackingNumber: shipment.tracking_number,
        status: shipment.status,
        destinationName: shipment.destination_name,
        destinationCity: shipment.destination_city,
        estimatedDeliveryDate: shipment.estimated_delivery_date,
        actualDeliveryDate: shipment.actual_delivery_date,
        updatedAt: shipment.updated_at,
      })),
      recentOrders: transactions.slice(0, 5).map((transaction) => ({
        id: transaction.id,
        number: transaction.transaction_number,
        status: transaction.status,
        date: transaction.transaction_date,
        totalAmount: Number(transaction.total_amount || 0),
        balanceAmount: Number(transaction.balance_amount || 0),
        itemCount: transaction.items?.length || 0,
      })),
      receivables: [],
      quotes: [],
      activities: [],
      timeline: [
        ...transactions.slice(0, 4).map((transaction) => ({
          date: transaction.updated_at || transaction.transaction_date,
          title: `Purchase ${transaction.transaction_number}`,
          text: `${this.toTitleCase(transaction.status)} purchase transaction for ${this.formatMoney(Number(transaction.total_amount || 0))}.`,
        })),
        ...shipments.slice(0, 4).map((shipment) => ({
          date: shipment.actual_delivery_date || shipment.updated_at || shipment.created_at,
          title: `Shipment ${shipment.tracking_number}`,
          text: `${this.toTitleCase(shipment.status)} shipment record.`,
        })),
        ...payables.slice(0, 4).map((payable) => ({
          date: payable.updated_at || payable.bill_date,
          title: `Bill ${payable.bill_number}`,
          text: `${this.toTitleCase(payable.status)} payable with ${this.formatMoney(Number(payable.balance_amount || 0))} outstanding.`,
        })),
      ]
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
        .slice(0, 8),
    };
  }

  private async resolvePortalActor(actorType: PortalActorType, email: string) {
    if (actorType === PortalActorType.CUSTOMER) {
      const customer = await this.customerRepo.findOne({
        where: {
          email,
          status: CustomerStatus.ACTIVE,
        },
      });

      if (!customer) {
        throw new UnauthorizedException('No active customer found for this email');
      }

      return {
        actorId: customer.id,
        tenantId: customer.tenant_id,
        displayName: customer.company_name || customer.contact_person || customer.email,
      };
    }

    const supplier = await this.supplierRepo.findOne({
      where: {
        email,
        is_active: true,
      },
    });

    if (!supplier) {
      throw new UnauthorizedException('No active supplier found for this email');
    }

    return {
      actorId: supplier.id,
      tenantId: supplier.tenant_id,
      displayName: supplier.name || supplier.email || 'Supplier',
    };
  }

  private async resolvePortalActorById(
    actorType: PortalActorType,
    actorId: string,
    tenantId: string,
  ) {
    if (actorType === PortalActorType.CUSTOMER) {
      const customer = await this.customerRepo.findOne({
        where: { id: actorId, tenant_id: tenantId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      return {
        actorId: customer.id,
        tenantId: customer.tenant_id,
        displayName:
          customer.company_name || customer.contact_person || customer.email,
        email: customer.email,
      };
    }

    const supplier = await this.supplierRepo.findOne({
      where: { id: actorId, tenant_id: tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return {
      actorId: supplier.id,
      tenantId: supplier.tenant_id,
      displayName: supplier.name || supplier.email || 'Supplier',
      email: supplier.email,
    };
  }

  private sumAmounts(values: Array<number | string | null | undefined>) {
    return values.reduce<number>(
      (sum, value) => sum + Number(value || 0),
      0,
    );
  }

  private formatMoney(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  }

  private toTitleCase(value: string) {
    return value
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
}
