import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetManagementController } from './asset-management.controller';
import { AssetManagementService } from './asset-management.service';
import { AssetEntity } from './entities/asset.entity';
import { AssetCategoryEntity } from './entities/asset-category.entity';
import { AssetLocationEntity } from './entities/asset-location.entity';
import { MaintenanceScheduleEntity } from './entities/maintenance-schedule.entity';
import { MaintenanceRecordEntity } from './entities/maintenance-record.entity';
import { AssetDepreciationEntity } from './entities/asset-depreciation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssetEntity,
      AssetCategoryEntity,
      AssetLocationEntity,
      MaintenanceScheduleEntity,
      MaintenanceRecordEntity,
      AssetDepreciationEntity,
    ]),
  ],
  controllers: [AssetManagementController],
  providers: [AssetManagementService],
  exports: [AssetManagementService],
})
export class AssetManagementModule {}
