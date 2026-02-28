import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { CustomerEntity } from './entities/customer.entity';
import { LeadEntity } from './entities/lead.entity';
import { LeadActivityEntity } from './entities/lead-activity.entity';
import { OpportunityEntity } from './entities/opportunity.entity';
import { OpportunityProductEntity } from './entities/opportunity-product.entity';
import { ContactEntity } from './entities/contact.entity';
import { ActivityEntity } from './entities/activity.entity';
import { QuoteEntity } from './entities/quote.entity';
import { QuoteItemEntity } from './entities/quote-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerEntity,
      LeadEntity,
      LeadActivityEntity,
      OpportunityEntity,
      OpportunityProductEntity,
      ContactEntity,
      ActivityEntity,
      QuoteEntity,
      QuoteItemEntity,
    ]),
  ],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
