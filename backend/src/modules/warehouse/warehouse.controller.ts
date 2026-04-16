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
  ParseUUIDPipe,
} from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MovementType } from './entities/stock-movement.entity';
import { RequireFeature } from '../subscriptions/decorators/require-feature.decorator';
import { RequireFeatureGuard } from '../subscriptions/guards/require-feature.guard';
import { PlanFeature } from '../subscriptions/subscription.constants';

@UseGuards(JwtAuthGuard, RequireFeatureGuard)
@RequireFeature(PlanFeature.WAREHOUSE)
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) { }

  // ── Warehouses ──────────────────────────────────────────────

  @Get()
  findAllWarehouses(@CurrentTenant() tenantId: string) {
    return this.warehouseService.findAllWarehouses(tenantId);
  }

  @Get(':id')
  findOneWarehouse(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.warehouseService.findOneWarehouse(id, tenantId);
  }

  @Post()
  createWarehouse(
    @Body() body: Record<string, unknown>,
    @CurrentTenant() tenantId: string,
  ) {
    return this.warehouseService.createWarehouse(body as any, tenantId);
  }

  @Put(':id')
  updateWarehouse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
    @CurrentTenant() tenantId: string,
  ) {
    return this.warehouseService.updateWarehouse(id, body as any, tenantId);
  }

  @Delete(':id')
  deleteWarehouse(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.warehouseService.deleteWarehouse(id, tenantId);
  }

  // ── Bins ─────────────────────────────────────────────────────

  @Get('bins/all')
  findAllBins(
    @CurrentTenant() tenantId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.warehouseService.findAllBins(tenantId, warehouseId);
  }

  @Post('bins')
  createBin(
    @Body() body: Record<string, unknown>,
    @CurrentTenant() tenantId: string,
  ) {
    return this.warehouseService.createBin(body as any, tenantId);
  }

  @Put('bins/:id')
  updateBin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
    @CurrentTenant() tenantId: string,
  ) {
    return this.warehouseService.updateBin(id, body as any, tenantId);
  }

  @Delete('bins/:id')
  deleteBin(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.warehouseService.deleteBin(id, tenantId);
  }

  // ── Stock Movements ──────────────────────────────────────────

  @Get('movements/all')
  findAllMovements(
    @CurrentTenant() tenantId: string,
    @Query('type') movementType?: MovementType,
  ) {
    return this.warehouseService.findAllMovements(tenantId, movementType);
  }

  @Get('movements/by-shipment/:shipmentId')
  findMovementsByShipment(
    @Param('shipmentId') shipmentId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.warehouseService.findMovementsByShipment(shipmentId, tenantId);
  }

  @Post('movements')
  createMovement(
    @Body() body: Record<string, unknown>,
    @CurrentTenant() tenantId: string,
  ) {
    return this.warehouseService.createMovement(body as any, tenantId);
  }

  @Put('movements/:id')
  updateMovement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
    @CurrentTenant() tenantId: string,
  ) {
    return this.warehouseService.updateMovement(id, body as any, tenantId);
  }

  @Delete('movements/:id')
  deleteMovement(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.warehouseService.deleteMovement(id, tenantId);
  }

  /**
   * Approve a pending stock movement.
   * Executes inventory change, creates JE, AP/AR bill, shipment (TRANSFER), compliance log.
   */
  @Post('movements/:id/approve')
  approveMovement(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.warehouseService.approveMovement(id, user?.id ?? null, tenantId);
  }

  /**
   * Reject a pending stock movement. Releases any stock reservation.
   */
  @Post('movements/:id/reject')
  rejectMovement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.warehouseService.rejectMovement(
      id,
      user?.id ?? null,
      body?.reason || 'No reason provided',
      tenantId,
    );
  }
}
