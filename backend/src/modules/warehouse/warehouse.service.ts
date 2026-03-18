import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WarehouseEntity } from './entities/warehouse.entity';
import { BinEntity } from './entities/bin.entity';
import {
  StockMovementEntity,
  MovementType,
} from './entities/stock-movement.entity';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(WarehouseEntity)
    private warehouseRepo: Repository<WarehouseEntity>,
    @InjectRepository(BinEntity)
    private binRepo: Repository<BinEntity>,
    @InjectRepository(StockMovementEntity)
    private movementRepo: Repository<StockMovementEntity>,
  ) {}

  async findAllWarehouses(tenantId: string) {
    const data = await this.warehouseRepo.find({
      where: { tenant_id: tenantId },
      order: { warehouse_name: 'ASC' },
    });
    return { data };
  }

  async findOneWarehouse(
    id: string,
    tenantId: string,
  ): Promise<WarehouseEntity> {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async createWarehouse(
    payload: Partial<WarehouseEntity>,
    tenantId: string,
  ) {
    if (!payload.warehouse_code?.trim())
      throw new BadRequestException('warehouse_code is required');
    if (!payload.warehouse_name?.trim())
      throw new BadRequestException('warehouse_name is required');
    if (!payload.location?.trim())
      throw new BadRequestException('location is required');

    const code = payload.warehouse_code.trim().toUpperCase();
    const existing = await this.warehouseRepo.findOne({
      where: { warehouse_code: code, tenant_id: tenantId },
    });
    if (existing)
      throw new ConflictException(`Warehouse code "${code}" already exists`);

    const warehouse = this.warehouseRepo.create({
      ...payload,
      warehouse_code: code,
      warehouse_name: payload.warehouse_name.trim(),
      tenant_id: tenantId,
    });
    return this.warehouseRepo.save(warehouse);
  }

  async updateWarehouse(
    id: string,
    payload: Partial<WarehouseEntity>,
    tenantId: string,
  ) {
    const warehouse = await this.findOneWarehouse(id, tenantId);
    if (
      payload.warehouse_code &&
      payload.warehouse_code !== warehouse.warehouse_code
    ) {
      const code = payload.warehouse_code.trim().toUpperCase();
      const conflict = await this.warehouseRepo.findOne({
        where: { warehouse_code: code, tenant_id: tenantId },
      });
      if (conflict)
        throw new ConflictException(`Warehouse code "${code}" already exists`);
      payload.warehouse_code = code;
    }
    Object.assign(warehouse, payload);
    return this.warehouseRepo.save(warehouse);
  }

  async deleteWarehouse(id: string, tenantId: string) {
    const warehouse = await this.findOneWarehouse(id, tenantId);
    const binCount = await this.binRepo.count({
      where: { warehouse_id: id, tenant_id: tenantId },
    });
    if (binCount > 0)
      throw new BadRequestException(
        `Cannot delete warehouse with ${binCount} bin(s). Remove bins first.`,
      );
    await this.warehouseRepo.remove(warehouse);
    return { message: 'Warehouse deleted successfully' };
  }

  async findAllBins(tenantId: string, warehouseId?: string) {
    const where: Record<string, string> = { tenant_id: tenantId };
    if (warehouseId) where.warehouse_id = warehouseId;

    const data = await this.binRepo.find({
      where,
      relations: ['warehouse'],
      order: { bin_code: 'ASC' },
    });
    return {
      data: data.map((b) => ({
        id: b.id,
        tenant_id: b.tenant_id,
        warehouse_id: b.warehouse_id,
        warehouse_name: b.warehouse?.warehouse_name ?? '',
        bin_code: b.bin_code,
        zone: b.zone,
        aisle: b.aisle,
        rack: b.rack,
        level: b.level,
        capacity: b.capacity,
        created_at: b.created_at,
        updated_at: b.updated_at,
      })),
    };
  }

  async findOneBin(id: string, tenantId: string): Promise<BinEntity> {
    const bin = await this.binRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!bin) throw new NotFoundException('Bin not found');
    return bin;
  }

  async createBin(payload: Partial<BinEntity>, tenantId: string) {
    const warehouseId = payload.warehouse_id;
    const binCode = payload.bin_code?.trim();
    if (!warehouseId) throw new BadRequestException('warehouse_id is required');
    if (!binCode) throw new BadRequestException('bin_code is required');

    await this.findOneWarehouse(warehouseId, tenantId);

    const existing = await this.binRepo.findOne({
      where: {
        warehouse_id: warehouseId,
        bin_code: binCode,
        tenant_id: tenantId,
      },
    });
    if (existing)
      throw new ConflictException(
        `Bin code "${binCode}" already exists in this warehouse`,
      );

    const bin = this.binRepo.create({
      ...payload,
      bin_code: binCode.toUpperCase(),
      tenant_id: tenantId,
    });
    return this.binRepo.save(bin);
  }

  async updateBin(
    id: string,
    payload: Partial<BinEntity>,
    tenantId: string,
  ) {
    const bin = await this.findOneBin(id, tenantId);
    Object.assign(bin, payload);
    return this.binRepo.save(bin);
  }

  async deleteBin(id: string, tenantId: string) {
    const bin = await this.findOneBin(id, tenantId);
    await this.binRepo.remove(bin);
    return { message: 'Bin deleted successfully' };
  }

  async findAllMovements(tenantId: string, movementType?: MovementType) {
    const where: Record<string, string> = { tenant_id: tenantId };
    if (movementType) where.movement_type = movementType;
    const data = await this.movementRepo.find({
      where,
      order: { movement_date: 'DESC', created_at: 'DESC' },
    });
    return { data };
  }

  async findOneMovement(
    id: string,
    tenantId: string,
  ): Promise<StockMovementEntity> {
    const movement = await this.movementRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!movement) throw new NotFoundException('Stock movement not found');
    return movement;
  }

  async createMovement(
    payload: Partial<StockMovementEntity>,
    tenantId: string,
  ) {
    if (!payload.movement_type)
      throw new BadRequestException('movement_type is required');
    const qty = Number(payload.quantity);
    if (!qty || qty <= 0)
      throw new BadRequestException('quantity must be a positive number');
    if (!payload.movement_date)
      throw new BadRequestException('movement_date is required');

    const movement_number = await this.generateMovementNumber(tenantId);
    const movement = this.movementRepo.create({
      ...payload,
      tenant_id: tenantId,
      movement_number,
      quantity: qty,
    });
    return this.movementRepo.save(movement);
  }

  async updateMovement(
    id: string,
    payload: Partial<StockMovementEntity>,
    tenantId: string,
  ) {
    const movement = await this.findOneMovement(id, tenantId);
    if (payload.quantity !== undefined) {
      const qty = Number(payload.quantity);
      if (qty <= 0)
        throw new BadRequestException('quantity must be a positive number');
      payload.quantity = qty;
    }
    Object.assign(movement, payload);
    return this.movementRepo.save(movement);
  }

  async deleteMovement(id: string, tenantId: string) {
    const movement = await this.findOneMovement(id, tenantId);
    await this.movementRepo.remove(movement);
    return { message: 'Stock movement deleted successfully' };
  }

  private async generateMovementNumber(tenantId: string): Promise<string> {
    const date = new Date();
    const prefix = `MOV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;

    const result = await this.movementRepo
      .createQueryBuilder('m')
      .select('MAX(m.movement_number)', 'max')
      .where('m.tenant_id = :tenantId', { tenantId })
      .andWhere('m.movement_number LIKE :prefix', { prefix: `${prefix}-%` })
      .getRawOne<{ max: string | null }>();

    let seq = 1;
    if (result?.max) {
      const parts = result.max.split('-');
      seq = parseInt(parts[parts.length - 1], 10) + 1;
    }
    return `${prefix}-${String(seq).padStart(5, '0')}`;
  }
}
