import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { TestAuthController } from './controllers/test-auth.controller';

import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { Role } from '../roles/role.entity';
import { UserRole } from '../roles/user-role.entity';
import { CustomerEntity } from '../crm/entities/customer.entity';
import { ActivityEntity } from '../crm/entities/activity.entity';
import { QuoteEntity } from '../crm/entities/quote.entity';
import { SupplierEntity } from '../suppliers/supplier.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SeedersModule } from '../../database/seeders/seeders.module';
import { ComplianceAuditModule } from '../compliance-audit/compliance-audit.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PortalAccountEntity } from './entities/portal-account.entity';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { ShipmentEntity } from '../transportation/entities/shipment.entity';
import { AccountReceivableEntity } from '../accounting/entities/account-receivable.entity';
import { AccountPayableEntity } from '../accounting/entities/account-payable.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      User,
      Role,
      UserRole,
      CustomerEntity,
      ActivityEntity,
      QuoteEntity,
      SupplierEntity,
      PortalAccountEntity,
      TransactionEntity,
      ShipmentEntity,
      AccountReceivableEntity,
      AccountPayableEntity,
    ]),
    PassportModule,
    ConfigModule,
    SeedersModule,
    ComplianceAuditModule,
    SubscriptionsModule,

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresIn = config.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN');
        return {
          secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          signOptions: {
            expiresIn: expiresIn as any, // '1h', '7d', etc.
          },
        };
      },
    }),
  ],
  controllers: [AuthController, TestAuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
