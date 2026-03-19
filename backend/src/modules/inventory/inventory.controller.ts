import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { InventoryEntity } from './entities/inventory.entity';

@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  private readonly logger = new Logger(InventoryController.name);

  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.inventoryService.findAll(tenantId);
  }

  @Get('low-stock')
  findLowStock(@CurrentTenant() tenantId: string) {
    return this.inventoryService.findLowStock(tenantId);
  }

  @Get('summary')
  getStockSummary(@CurrentTenant() tenantId: string) {
    return this.inventoryService.getStockSummary(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.inventoryService.findOne(id, tenantId);
  }

  @Post()
  async create(
    @Body() data: Partial<InventoryEntity>,
    @CurrentTenant() tenantId: string,
  ) {
    try {
      // Basic required validation
      if (!data.product_name || !data.sku) {
        throw new BadRequestException('product_name and sku are required');
      }

      // Coerce numeric fields safely
      const quantity = data.quantity !== undefined ? Number(data.quantity) : 0;
      const reserved_quantity =
        data.reserved_quantity !== undefined
          ? Number(data.reserved_quantity)
          : 0;
      const unit_cost =
        data.unit_cost !== undefined ? Number(data.unit_cost) : 0;
      const unit_price =
        data.unit_price !== undefined ? Number(data.unit_price) : 0;
      const reorder_level =
        data.reorder_level !== undefined ? Number(data.reorder_level) : 10;
      const max_stock_level =
        data.max_stock_level !== undefined ? Number(data.max_stock_level) : 100;

      if (
        Number.isNaN(quantity) ||
        Number.isNaN(reserved_quantity) ||
        Number.isNaN(unit_cost) ||
        Number.isNaN(unit_price) ||
        Number.isNaN(reorder_level) ||
        Number.isNaN(max_stock_level)
      ) {
        throw new BadRequestException('Numeric fields contain invalid values');
      }

      const payload: Partial<InventoryEntity> = {
        ...data,
        tenant_id: tenantId,
        quantity,
        reserved_quantity,
        available_quantity: quantity - reserved_quantity,
        unit_cost,
        unit_price,
        reorder_level,
        max_stock_level,
      };

      const created = await this.inventoryService.create(payload, tenantId);
      return created;
    } catch (error: any) {
      this.logger.error(
        'Failed to create inventory item',
        error?.stack || error?.message,
        { data },
      );
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to create inventory item');
    }
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<InventoryEntity>,
    @CurrentTenant() tenantId: string,
  ) {
    return this.inventoryService.update(id, data, tenantId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.inventoryService.delete(id, tenantId);
    return { message: 'Inventory item deleted successfully' };
  }

  @Post(':id/adjust-stock')
  adjustStock(
    @Param('id') id: string,
    @Body() body: { quantity: number; movement_type: 'IN' | 'OUT' | 'ADJUSTMENT'; reference?: string },
    @CurrentTenant() tenantId: string,
  ) {
    return this.inventoryService.adjustStock(id, body.quantity, body.movement_type, tenantId, body.reference);
  }
}
