import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceManagementController } from './service-management.controller';
import { ServiceManagementService } from './service-management.service';
import { IntegrationsService } from './integrations.service';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ServiceTicketEntity } from './entities/service-ticket.entity';
import { TicketCategoryEntity } from './entities/ticket-category.entity';
import { SLAPolicyEntity } from './entities/sla-policy.entity';
import { SLAViolationEntity } from './entities/sla-violation.entity';
import { FieldServiceOrderEntity } from './entities/field-service-order.entity';
import { ServiceContractEntity } from './entities/service-contract.entity';
import { KnowledgeBaseArticleEntity } from './entities/knowledge-base-article.entity';
import { TicketIntegrationEntity } from './entities/ticket-integration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceTicketEntity,
      TicketCategoryEntity,
      SLAPolicyEntity,
      SLAViolationEntity,
      FieldServiceOrderEntity,
      ServiceContractEntity,
      KnowledgeBaseArticleEntity,
      TicketIntegrationEntity,
    ]),
    SubscriptionsModule,
  ],
  controllers: [ServiceManagementController],
  providers: [ServiceManagementService, IntegrationsService],
  exports: [ServiceManagementService],
})
export class ServiceManagementModule {}
