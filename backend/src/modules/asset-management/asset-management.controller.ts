import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { AssetManagementService } from './asset-management.service';
import { AssetStatus } from './entities/asset.entity';
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

@Controller('asset-management')
@UseGuards(JwtAuthGuard)
export class AssetManagementController {
  constructor(
    private readonly assetManagementService: AssetManagementService,
  ) {}

  // ==================== CATEGORY ENDPOINTS ====================

  @Post('categories')
  createCategory(
    @Body() data: CreateAssetCategoryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.createCategory(data, tenantId);
  }

  @Get('categories')
  getCategories(@CurrentTenant() tenantId: string) {
    return this.assetManagementService.getCategories(tenantId);
  }

  @Get('categories/:id')
  getCategory(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.assetManagementService.getCategory(id, tenantId);
  }

  @Put('categories/:id')
  updateCategory(
    @Param('id') id: string,
    @Body() data: UpdateAssetCategoryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.updateCategory(id, data, tenantId);
  }

  // ==================== LOCATION ENDPOINTS ====================

  @Post('locations')
  createLocation(
    @Body() data: CreateAssetLocationDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.createLocation(data, tenantId);
  }

  @Get('locations')
  getLocations(@CurrentTenant() tenantId: string) {
    return this.assetManagementService.getLocations(tenantId);
  }

  @Get('locations/:id')
  getLocation(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.assetManagementService.getLocation(id, tenantId);
  }

  @Put('locations/:id')
  updateLocation(
    @Param('id') id: string,
    @Body() data: UpdateAssetLocationDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.updateLocation(id, data, tenantId);
  }

  // ==================== ASSET ENDPOINTS ====================

  @Post('assets')
  createAsset(
    @Body() data: CreateAssetDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.createAsset(data, tenantId);
  }

  @Get('assets')
  async getAssets(@CurrentTenant() tenantId: string) {
    console.log('🔍 Backend: Fetching assets for tenant:', tenantId);
    const assets = await this.assetManagementService.getAssets(tenantId);
    console.log('🔍 Backend: Assets found:', assets?.length || 0);
    return assets;
  }

  @Get('assets/:id')
  getAsset(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.assetManagementService.getAsset(id, tenantId);
  }

  @Put('assets/:id')
  updateAsset(
    @Param('id') id: string,
    @Body() data: UpdateAssetDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.updateAsset(id, data, tenantId);
  }

  @Delete('assets/:id')
  deleteAsset(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.assetManagementService.deleteAsset(id, tenantId);
  }

  @Post('assets/:id/assign')
  assignAsset(
    @Param('id') id: string,
    @Body() data: AssignAssetDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.assignAsset(id, data, tenantId);
  }

  @Post('assets/:id/unassign')
  unassignAsset(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.assetManagementService.unassignAsset(id, tenantId);
  }

  @Post('assets/:id/transfer')
  transferAsset(
    @Param('id') id: string,
    @Body() data: TransferAssetDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.transferAsset(id, data, tenantId);
  }

  @Get('assets/by-category/:categoryId')
  getAssetsByCategory(
    @Param('categoryId') categoryId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.getAssetsByCategory(
      categoryId,
      tenantId,
    );
  }

  @Get('assets/by-location/:locationId')
  getAssetsByLocation(
    @Param('locationId') locationId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.getAssetsByLocation(
      locationId,
      tenantId,
    );
  }

  @Get('assets/by-status/:status')
  getAssetsByStatus(
    @Param('status') status: AssetStatus,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.getAssetsByStatus(status, tenantId);
  }

  // ==================== MAINTENANCE SCHEDULE ENDPOINTS ====================

  @Post('schedules')
  createSchedule(
    @Body() data: CreateMaintenanceScheduleDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.createSchedule(data, tenantId);
  }

  @Get('schedules')
  getSchedules(@CurrentTenant() tenantId: string) {
    return this.assetManagementService.getSchedules(tenantId);
  }

  @Get('schedules/:id')
  getSchedule(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.assetManagementService.getSchedule(id, tenantId);
  }

  @Put('schedules/:id')
  updateSchedule(
    @Param('id') id: string,
    @Body() data: UpdateMaintenanceScheduleDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.updateSchedule(id, data, tenantId);
  }

  @Get('schedules/asset/:assetId')
  getAssetSchedules(
    @Param('assetId') assetId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.getAssetSchedules(assetId, tenantId);
  }

  // ==================== MAINTENANCE RECORD ENDPOINTS ====================

  @Post('records')
  createRecord(
    @Body() data: CreateMaintenanceRecordDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.createRecord(data, tenantId);
  }

  @Get('records')
  getRecords(@CurrentTenant() tenantId: string) {
    return this.assetManagementService.getRecords(tenantId);
  }

  @Get('records/:id')
  getRecord(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.assetManagementService.getRecord(id, tenantId);
  }

  @Post('records/:id/complete')
  completeMaintenance(
    @Param('id') id: string,
    @Body() data: CompleteMaintenanceDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.completeMaintenance(
      id,
      data,
      tenantId,
    );
  }

  @Get('records/asset/:assetId')
  getAssetRecords(
    @Param('assetId') assetId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.getAssetRecords(assetId, tenantId);
  }

  // ==================== DEPRECIATION ENDPOINTS ====================

  @Post('depreciation/:assetId/calculate')
  calculateDepreciation(
    @Param('assetId') assetId: string,
    @Query('year') year: number,
    @Query('month') month: number,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.calculateDepreciation(
      assetId,
      Number(year),
      Number(month),
      tenantId,
    );
  }

  @Get('depreciation/:assetId')
  getAssetDepreciation(
    @Param('assetId') assetId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.assetManagementService.getAssetDepreciation(assetId, tenantId);
  }

  // ==================== REPORTING ENDPOINTS ====================

  @Get('reports/summary')
  getAssetSummary(@CurrentTenant() tenantId: string) {
    return this.assetManagementService.getAssetSummary(tenantId);
  }

  @Get('reports/maintenance-summary')
  getMaintenanceSummary(@CurrentTenant() tenantId: string) {
    return this.assetManagementService.getMaintenanceSummary(tenantId);
  }
}
