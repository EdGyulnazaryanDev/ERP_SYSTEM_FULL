import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComprehensiveSeeder } from './comprehensive.seeder';
import { Role } from '../../modules/roles/role.entity';
import { Permission } from '../../modules/permissions/permission.entity';
import { RolePermission } from '../../modules/permissions/role-permission.entity';
import { CategoryEntity } from '../../modules/categories/entities/category.entity';
import { InventoryEntity } from '../../modules/inventory/entities/inventory.entity';
import { SettingsModule } from '../../modules/settings/settings.module';
import { WarehouseEntity } from '../../modules/warehouse/entities/warehouse.entity';
import { BinEntity } from '../../modules/warehouse/entities/bin.entity';
import { StockMovementEntity } from '../../modules/warehouse/entities/stock-movement.entity';
import { SupplierEntity } from '../../modules/suppliers/supplier.entity';
import { CourierEntity } from '../../modules/transportation/entities/courier.entity';
import { ShipmentEntity } from '../../modules/transportation/entities/shipment.entity';
import { ChartOfAccountEntity } from '../../modules/accounting/entities/chart-of-account.entity';
import { JournalEntryEntity } from '../../modules/accounting/entities/journal-entry.entity';
import { JournalEntryLineEntity } from '../../modules/accounting/entities/journal-entry-line.entity';
import { AccountReceivableEntity } from '../../modules/accounting/entities/account-receivable.entity';
import { AccountPayableEntity } from '../../modules/accounting/entities/account-payable.entity';
import { BankAccountEntity } from '../../modules/accounting/entities/bank-account.entity';
import { PurchaseRequisitionEntity } from '../../modules/procurement/entities/purchase-requisition.entity';
import { PurchaseRequisitionItemEntity } from '../../modules/procurement/entities/purchase-requisition-item.entity';
import { PurchaseOrderEntity } from '../../modules/procurement/entities/purchase-order.entity';
import { PurchaseOrderItemEntity } from '../../modules/procurement/entities/purchase-order-item.entity';
import { RfqEntity } from '../../modules/procurement/entities/rfq.entity';
import { RfqItemEntity } from '../../modules/procurement/entities/rfq-item.entity';
import { EmployeeEntity } from '../../modules/hr/entities/employee.entity';
import { CustomerEntity } from '../../modules/crm/entities/customer.entity';
import { ContactEntity } from '../../modules/crm/entities/contact.entity';
import { LeadEntity } from '../../modules/crm/entities/lead.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Permission,
      RolePermission,
      CategoryEntity,
      InventoryEntity,
      WarehouseEntity,
      BinEntity,
      StockMovementEntity,
      SupplierEntity,
      CourierEntity,
      ShipmentEntity,
      ChartOfAccountEntity,
      JournalEntryEntity,
      JournalEntryLineEntity,
      AccountReceivableEntity,
      AccountPayableEntity,
      BankAccountEntity,
      PurchaseRequisitionEntity,
      PurchaseRequisitionItemEntity,
      PurchaseOrderEntity,
      PurchaseOrderItemEntity,
      RfqEntity,
      RfqItemEntity,
      EmployeeEntity,
      CustomerEntity,
      ContactEntity,
      LeadEntity,
    ]),
    SettingsModule,
  ],
  providers: [ComprehensiveSeeder],
  exports: [ComprehensiveSeeder],
})
export class SeederModule {}
