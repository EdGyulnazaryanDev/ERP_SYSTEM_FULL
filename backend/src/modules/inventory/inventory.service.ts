import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { InventoryEntity } from './entities/inventory.entity';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(InventoryEntity)
    private inventoryRepo: Repository<InventoryEntity>,
  ) {}

  async findAll(tenantId: string): Promise<InventoryEntity[]> {
    return this.inventoryRepo.find({
      where: { tenant_id: tenantId },
      order: { product_name: 'ASC' },
    });
  }

  async findLowStock(tenantId: string): Promise<InventoryEntity[]> {
    const items = await this.inventoryRepo.find({
      where: { tenant_id: tenantId },
    });

    return items.filter(
      (item) => item.available_quantity <= item.reorder_level,
    );
  }

  async findOne(id: string, tenantId: string): Promise<InventoryEntity> {
    const inventory = await this.inventoryRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory item not found');
    }

    return inventory;
  }

  async create(
    data: Partial<InventoryEntity>,
    tenantId: string,
  ): Promise<InventoryEntity> {
    try {
      // Check SKU uniqueness within tenant
      if (data.sku) {
        const existing = await this.inventoryRepo.findOne({
          where: { sku: data.sku, tenant_id: tenantId } as any,
        });
        if (existing) {
          throw new ConflictException('SKU already exists');
        }
      }

      const inventory = this.inventoryRepo.create({
        ...data,
        tenant_id: tenantId,
        available_quantity: data.quantity || 0,
      });

      return await this.inventoryRepo.save(inventory);
    } catch (err: any) {
      this.logger.error(
        'Failed to create inventory item',
        err?.stack || err?.message,
        { data },
      );
      if (err instanceof ConflictException) throw err;
      throw new InternalServerErrorException('Failed to create inventory item');
    }
  }

  async update(
    id: string,
    data: Partial<InventoryEntity>,
    tenantId: string,
  ): Promise<InventoryEntity> {
    const inventory = await this.findOne(id, tenantId);

    Object.assign(inventory, data);

    if (data.quantity !== undefined || data.reserved_quantity !== undefined) {
      inventory.available_quantity =
        inventory.quantity - inventory.reserved_quantity;
    }

    return this.inventoryRepo.save(inventory);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const inventory = await this.findOne(id, tenantId);
    await this.inventoryRepo.remove(inventory);
  }

  async getStockSummary(tenantId: string): Promise<any> {
    const items = await this.findAll(tenantId);

    const summary = {
      totalItems: items.length,
      totalQuantity: 0,
      totalValue: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      categories: {} as any,
    };

    items.forEach((item) => {
      summary.totalQuantity += item.quantity;
      summary.totalValue += item.quantity * Number(item.unit_cost);

      if (item.available_quantity <= 0) {
        summary.outOfStockItems++;
      } else if (item.available_quantity <= item.reorder_level) {
        summary.lowStockItems++;
      }
    });

    return summary;
  }
}
