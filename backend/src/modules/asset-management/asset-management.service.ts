import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetEntity, AssetStatus } from './entities/asset.entity';
import { AssetCategoryEntity } from './entities/asset-category.entity';
import { AssetLocationEntity } from './entities/asset-location.entity';
import { MaintenanceScheduleEntity } from './entities/maintenance-schedule.entity';
import {
  MaintenanceRecordEntity,
  MaintenanceStatus,
} from './entities/maintenance-record.entity';
import {
  AssetDepreciationEntity,
  DepreciationMethod,
} from './entities/asset-depreciation.entity';
import type {
  CreateAssetDto,
  UpdateAssetDto,
  AssignAssetDto,
  TransferAssetDto,
} from './dto/create-asset.dto';
import type {
  CreateAssetCategoryDto,
  UpdateAssetCategoryDto,
} from './dto/create-asset-category.dto';
import type {
  CreateAssetLocationDto,
  UpdateAssetLocationDto,
} from './dto/create-asset-location.dto';
import type {
  CreateMaintenanceScheduleDto,
  UpdateMaintenanceScheduleDto,
  CreateMaintenanceRecordDto,
  CompleteMaintenanceDto,
} from './dto/create-maintenance.dto';

@Injectable()
export class AssetManagementService {
  constructor(
    @InjectRepository(AssetEntity)
    private assetRepo: Repository<AssetEntity>,
    @InjectRepository(AssetCategoryEntity)
    private categoryRepo: Repository<AssetCategoryEntity>,
    @InjectRepository(AssetLocationEntity)
    private locationRepo: Repository<AssetLocationEntity>,
    @InjectRepository(MaintenanceScheduleEntity)
    private scheduleRepo: Repository<MaintenanceScheduleEntity>,
    @InjectRepository(MaintenanceRecordEntity)
    private recordRepo: Repository<MaintenanceRecordEntity>,
    @InjectRepository(AssetDepreciationEntity)
    private depreciationRepo: Repository<AssetDepreciationEntity>,
  ) {}

  // ==================== ASSET CATEGORY METHODS ====================

  async createCategory(
    data: CreateAssetCategoryDto,
    tenantId: string,
  ): Promise<AssetCategoryEntity> {
    const existing = await this.categoryRepo.findOne({
      where: { code: data.code, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Category code already exists');
    }

    const category = this.categoryRepo.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.categoryRepo.save(category);
  }

  async getCategories(tenantId: string): Promise<AssetCategoryEntity[]> {
    return this.categoryRepo.find({
      where: { tenant_id: tenantId, is_active: true },
      order: { name: 'ASC' },
    });
  }

  async getCategory(
    id: string,
    tenantId: string,
  ): Promise<AssetCategoryEntity> {
    const category = await this.categoryRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async updateCategory(
    id: string,
    data: UpdateAssetCategoryDto,
    tenantId: string,
  ): Promise<AssetCategoryEntity> {
    const category = await this.getCategory(id, tenantId);
    Object.assign(category, data);
    return this.categoryRepo.save(category);
  }

  // ==================== ASSET LOCATION METHODS ====================

  async createLocation(
    data: CreateAssetLocationDto,
    tenantId: string,
  ): Promise<AssetLocationEntity> {
    const existing = await this.locationRepo.findOne({
      where: { code: data.code, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Location code already exists');
    }

    const location = this.locationRepo.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.locationRepo.save(location);
  }

  async getLocations(tenantId: string): Promise<AssetLocationEntity[]> {
    return this.locationRepo.find({
      where: { tenant_id: tenantId, is_active: true },
      order: { name: 'ASC' },
    });
  }

  async getLocation(
    id: string,
    tenantId: string,
  ): Promise<AssetLocationEntity> {
    const location = await this.locationRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  async updateLocation(
    id: string,
    data: UpdateAssetLocationDto,
    tenantId: string,
  ): Promise<AssetLocationEntity> {
    const location = await this.getLocation(id, tenantId);
    Object.assign(location, data);
    return this.locationRepo.save(location);
  }

  // ==================== ASSET METHODS ====================

  async createAsset(
    data: CreateAssetDto,
    tenantId: string,
  ): Promise<AssetEntity> {
    const existing = await this.assetRepo.findOne({
      where: { asset_code: data.asset_code, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Asset code already exists');
    }

    await this.getCategory(data.category_id, tenantId);

    if (data.location_id) {
      await this.getLocation(data.location_id, tenantId);
    }

    const asset = this.assetRepo.create({
      ...data,
      current_value: data.purchase_cost,
      tenant_id: tenantId,
    });

    return this.assetRepo.save(asset);
  }

  async getAssets(tenantId: string): Promise<AssetEntity[]> {
    return this.assetRepo.find({
      where: { tenant_id: tenantId },
      relations: ['category'],
      order: { created_at: 'DESC' },
    });
  }

  async getAsset(id: string, tenantId: string): Promise<AssetEntity> {
    const asset = await this.assetRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['category'],
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  async updateAsset(
    id: string,
    data: UpdateAssetDto,
    tenantId: string,
  ): Promise<AssetEntity> {
    const asset = await this.getAsset(id, tenantId);

    if (data.location_id) {
      await this.getLocation(data.location_id, tenantId);
    }

    Object.assign(asset, data);
    return this.assetRepo.save(asset);
  }

  async deleteAsset(id: string, tenantId: string): Promise<void> {
    const asset = await this.getAsset(id, tenantId);

    if (asset.status === AssetStatus.IN_USE) {
      throw new BadRequestException('Cannot delete asset that is in use');
    }

    await this.assetRepo.remove(asset);
  }

  async assignAsset(
    id: string,
    data: AssignAssetDto,
    tenantId: string,
  ): Promise<AssetEntity> {
    const asset = await this.getAsset(id, tenantId);

    if (asset.status === AssetStatus.IN_USE) {
      throw new BadRequestException('Asset is already assigned');
    }

    asset.assigned_to = data.assigned_to;
    asset.assigned_date = new Date(data.assigned_date);
    asset.status = AssetStatus.IN_USE;

    return this.assetRepo.save(asset);
  }

  async unassignAsset(id: string, tenantId: string): Promise<AssetEntity> {
    const asset = await this.getAsset(id, tenantId);

    asset.assigned_to = null as any;
    asset.assigned_date = null as any;
    asset.status = AssetStatus.AVAILABLE;

    return this.assetRepo.save(asset);
  }

  async transferAsset(
    id: string,
    data: TransferAssetDto,
    tenantId: string,
  ): Promise<AssetEntity> {
    const asset = await this.getAsset(id, tenantId);
    await this.getLocation(data.location_id, tenantId);

    asset.location_id = data.location_id;
    if (data.notes) {
      asset.notes = data.notes;
    }

    return this.assetRepo.save(asset);
  }

  async getAssetsByCategory(
    categoryId: string,
    tenantId: string,
  ): Promise<AssetEntity[]> {
    return this.assetRepo.find({
      where: { category_id: categoryId, tenant_id: tenantId },
      relations: ['category'],
      order: { name: 'ASC' },
    });
  }

  async getAssetsByLocation(
    locationId: string,
    tenantId: string,
  ): Promise<AssetEntity[]> {
    return this.assetRepo.find({
      where: { location_id: locationId, tenant_id: tenantId },
      relations: ['category'],
      order: { name: 'ASC' },
    });
  }

  async getAssetsByStatus(
    status: AssetStatus,
    tenantId: string,
  ): Promise<AssetEntity[]> {
    return this.assetRepo.find({
      where: { status, tenant_id: tenantId },
      relations: ['category'],
      order: { name: 'ASC' },
    });
  }

  // ==================== MAINTENANCE SCHEDULE METHODS ====================

  async createSchedule(
    data: CreateMaintenanceScheduleDto,
    tenantId: string,
  ): Promise<MaintenanceScheduleEntity> {
    await this.getAsset(data.asset_id, tenantId);

    const schedule = this.scheduleRepo.create({
      ...data,
      next_due_date: new Date(data.start_date),
      tenant_id: tenantId,
    });

    return this.scheduleRepo.save(schedule);
  }

  async getSchedules(tenantId: string): Promise<MaintenanceScheduleEntity[]> {
    return this.scheduleRepo.find({
      where: { tenant_id: tenantId },
      relations: ['asset'],
      order: { next_due_date: 'ASC' },
    });
  }

  async getSchedule(
    id: string,
    tenantId: string,
  ): Promise<MaintenanceScheduleEntity> {
    const schedule = await this.scheduleRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['asset'],
    });

    if (!schedule) {
      throw new NotFoundException('Maintenance schedule not found');
    }

    return schedule;
  }

  async updateSchedule(
    id: string,
    data: UpdateMaintenanceScheduleDto,
    tenantId: string,
  ): Promise<MaintenanceScheduleEntity> {
    const schedule = await this.getSchedule(id, tenantId);
    Object.assign(schedule, data);
    return this.scheduleRepo.save(schedule);
  }

  async getAssetSchedules(
    assetId: string,
    tenantId: string,
  ): Promise<MaintenanceScheduleEntity[]> {
    return this.scheduleRepo.find({
      where: { asset_id: assetId, tenant_id: tenantId },
      order: { next_due_date: 'ASC' },
    });
  }

  // ==================== MAINTENANCE RECORD METHODS ====================

  async createRecord(
    data: CreateMaintenanceRecordDto,
    tenantId: string,
  ): Promise<MaintenanceRecordEntity> {
    await this.getAsset(data.asset_id, tenantId);

    const count = await this.recordRepo.count({
      where: { tenant_id: tenantId },
    });
    const recordNumber = `MNT-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const record = this.recordRepo.create({
      ...data,
      record_number: recordNumber,
      tenant_id: tenantId,
    });

    return this.recordRepo.save(record);
  }

  async getRecords(tenantId: string): Promise<MaintenanceRecordEntity[]> {
    return this.recordRepo.find({
      where: { tenant_id: tenantId },
      relations: ['asset'],
      order: { scheduled_date: 'DESC' },
    });
  }

  async getRecord(
    id: string,
    tenantId: string,
  ): Promise<MaintenanceRecordEntity> {
    const record = await this.recordRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['asset'],
    });

    if (!record) {
      throw new NotFoundException('Maintenance record not found');
    }

    return record;
  }

  async completeMaintenance(
    id: string,
    data: CompleteMaintenanceDto,
    tenantId: string,
  ): Promise<MaintenanceRecordEntity> {
    const record = await this.getRecord(id, tenantId);

    if (record.status === MaintenanceStatus.COMPLETED) {
      throw new BadRequestException('Maintenance already completed');
    }

    const totalCost = Number(data.labor_cost) + Number(data.parts_cost);

    Object.assign(record, {
      ...data,
      total_cost: totalCost,
      status: MaintenanceStatus.COMPLETED,
    });

    return this.recordRepo.save(record);
  }

  async getAssetRecords(
    assetId: string,
    tenantId: string,
  ): Promise<MaintenanceRecordEntity[]> {
    return this.recordRepo.find({
      where: { asset_id: assetId, tenant_id: tenantId },
      order: { scheduled_date: 'DESC' },
    });
  }

  // ==================== DEPRECIATION METHODS ====================

  async calculateDepreciation(
    assetId: string,
    year: number,
    month: number,
    tenantId: string,
  ): Promise<AssetDepreciationEntity> {
    const asset = await this.getAsset(assetId, tenantId);
    const category = await this.getCategory(asset.category_id, tenantId);

    if (!category.depreciation_rate || !category.useful_life_years) {
      throw new BadRequestException(
        'Category must have depreciation rate and useful life configured',
      );
    }

    const existing = await this.depreciationRepo.findOne({
      where: {
        asset_id: assetId,
        year,
        month,
        tenant_id: tenantId,
      },
    });

    if (existing) {
      throw new ConflictException('Depreciation already calculated for this period');
    }

    const monthlyRate = Number(category.depreciation_rate) / 12;
    const depreciationAmount =
      (Number(asset.purchase_cost) * monthlyRate) / 100;

    const previousDepreciation = await this.depreciationRepo.findOne({
      where: { asset_id: assetId, tenant_id: tenantId },
      order: { depreciation_date: 'DESC' },
    });

    const accumulatedDepreciation = previousDepreciation
      ? Number(previousDepreciation.accumulated_depreciation) +
        depreciationAmount
      : depreciationAmount;

    const openingValue = previousDepreciation
      ? Number(previousDepreciation.closing_value)
      : Number(asset.purchase_cost);

    const closingValue = openingValue - depreciationAmount;

    const depreciation = this.depreciationRepo.create({
      asset_id: assetId,
      method: DepreciationMethod.STRAIGHT_LINE,
      year,
      month,
      depreciation_date: new Date(year, month - 1, 1),
      opening_value: openingValue,
      depreciation_amount: depreciationAmount,
      accumulated_depreciation: accumulatedDepreciation,
      closing_value: closingValue,
      depreciation_rate: category.depreciation_rate,
      tenant_id: tenantId,
    });

    const saved = await this.depreciationRepo.save(depreciation);

    asset.current_value = closingValue;
    asset.accumulated_depreciation = accumulatedDepreciation;
    await this.assetRepo.save(asset);

    return saved;
  }

  async getAssetDepreciation(
    assetId: string,
    tenantId: string,
  ): Promise<AssetDepreciationEntity[]> {
    return this.depreciationRepo.find({
      where: { asset_id: assetId, tenant_id: tenantId },
      order: { depreciation_date: 'DESC' },
    });
  }

  // ==================== REPORTING METHODS ====================

  async getAssetSummary(tenantId: string): Promise<any> {
    const assets = await this.getAssets(tenantId);

    const totalAssets = assets.length;
    const totalValue = assets.reduce(
      (sum, a) => sum + Number(a.current_value),
      0,
    );
    const totalDepreciation = assets.reduce(
      (sum, a) => sum + Number(a.accumulated_depreciation),
      0,
    );

    const byStatus = {
      available: assets.filter((a) => a.status === AssetStatus.AVAILABLE)
        .length,
      in_use: assets.filter((a) => a.status === AssetStatus.IN_USE).length,
      under_maintenance: assets.filter(
        (a) => a.status === AssetStatus.UNDER_MAINTENANCE,
      ).length,
      retired: assets.filter((a) => a.status === AssetStatus.RETIRED).length,
      disposed: assets.filter((a) => a.status === AssetStatus.DISPOSED).length,
    };

    return {
      total_assets: totalAssets,
      total_value: totalValue,
      total_depreciation: totalDepreciation,
      net_value: totalValue - totalDepreciation,
      by_status: byStatus,
    };
  }

  async getMaintenanceSummary(tenantId: string): Promise<any> {
    const records = await this.getRecords(tenantId);

    const totalRecords = records.length;
    const totalCost = records.reduce((sum, r) => sum + Number(r.total_cost), 0);

    const byStatus = {
      scheduled: records.filter((r) => r.status === MaintenanceStatus.SCHEDULED)
        .length,
      in_progress: records.filter(
        (r) => r.status === MaintenanceStatus.IN_PROGRESS,
      ).length,
      completed: records.filter((r) => r.status === MaintenanceStatus.COMPLETED)
        .length,
      cancelled: records.filter((r) => r.status === MaintenanceStatus.CANCELLED)
        .length,
    };

    return {
      total_records: totalRecords,
      total_cost: totalCost,
      by_status: byStatus,
    };
  }
}
