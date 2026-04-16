import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core/core.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { DynamicModulesModule } from './modules/dynamic-modules/dynamic-modules.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { FinanceModule } from './modules/finance/finance.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TransportationModule } from './modules/transportation/transportation.module';
import { SeederModule } from './database/seeders/seeder.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { HrModule } from './modules/hr/hr.module';
import { CrmModule } from './modules/crm/crm.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProjectManagementModule } from './modules/project-management/project-management.module';
import { ServiceManagementModule } from './modules/service-management/service-management.module';
import { AssetManagementModule } from './modules/asset-management/asset-management.module';
import { BiReportingModule } from './modules/bi-reporting/bi-reporting.module';
import { ManufacturingModule } from './modules/manufacturing/manufacturing.module';
import { WorkflowAutomationModule } from './modules/workflow-automation/workflow-automation.module';
import { ComplianceAuditModule } from './modules/compliance-audit/compliance-audit.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { SystemAdminModule } from './modules/system-admin/system-admin.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ChatModule } from './modules/chat/chat.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { KafkaModule } from './infrastructure/kafka/kafka.module';
import { MinioModule } from './infrastructure/minio/minio.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { BrainsModule } from './brains/brains.module';
import { DocumentsModule } from './modules/documents/documents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', global: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USER') ?? config.get('POSTGRES_USER'),
        password: config.get('DB_PASSWORD') ?? config.get('POSTGRES_PASSWORD'),
        database: config.get('DB_NAME') ?? config.get('POSTGRES_DB'),
        autoLoadEntities: true,
        synchronize: true,
        ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    CoreModule,
    SubscriptionsModule,
    SystemAdminModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    RbacModule,
    DynamicModulesModule,
    ProductsModule,
    CategoriesModule,
    SuppliersModule,
    InventoryModule,
    TransactionsModule,
    FinanceModule,
    SettingsModule,
    TransportationModule,
    SeederModule,
    WarehouseModule,
    PaymentsModule,
    HrModule,
    CrmModule,
    ProcurementModule,
    AccountingModule,
    ProjectManagementModule,
    ServiceManagementModule,
    AssetManagementModule,
    BiReportingModule,
    ManufacturingModule,
    WorkflowAutomationModule,
    ComplianceAuditModule,
    CommunicationModule,
    DashboardModule,
    ChatModule,
    RedisModule,
    KafkaModule,
    MinioModule,
    BrainsModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule { }
