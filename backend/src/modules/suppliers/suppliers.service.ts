import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { SupplierEntity } from './supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PaginatedResponse } from '../users/types';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(SupplierEntity)
    private readonly supplierRepository: Repository<SupplierEntity>,
  ) {}

  // Create supplier
  async create(
    createDto: CreateSupplierDto,
    tenantId: string,
  ): Promise<SupplierEntity> {
    // Check if supplier with name already exists
    const existing = await this.supplierRepository.findOne({
      where: { name: createDto.name, tenant_id: tenantId },
    });

    if (existing) {
      throw new BadRequestException('Supplier with this name already exists');
    }

    const supplier = this.supplierRepository.create({
      ...createDto,
      tenant_id: tenantId,
      is_active: createDto.is_active !== false,
    });

    return this.supplierRepository.save(supplier);
  }

  // Get all suppliers with pagination and search
  async findAllPaginated(
    tenantId: string,
    page: number = 1,
    pageSize: number = 10,
    search?: string,
  ): Promise<PaginatedResponse<SupplierEntity>> {
    const where: any = { tenant_id: tenantId };

    if (search) {
      where.name = Like(`%${search}%`);
    }

    const [data, total] = await this.supplierRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { created_at: 'DESC' },
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Get single supplier
  async findOne(id: string, tenantId: string): Promise<SupplierEntity> {
    const supplier = await this.supplierRepository.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  // Get all suppliers (simple, no pagination)
  async findAll(tenantId: string): Promise<SupplierEntity[]> {
    return this.supplierRepository.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  // Get supplier names only
  async findSupplierNames(tenantId: string): Promise<string[]> {
    const suppliers = await this.supplierRepository
      .createQueryBuilder('supplier')
      .select('DISTINCT supplier.name', 'name')
      .where('supplier.tenant_id = :tenantId', { tenantId })
      .andWhere('supplier.is_active = true')
      .orderBy('supplier.name', 'ASC')
      .getRawMany();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return suppliers.map((s) => s.name).filter(Boolean);
  }

  // Update supplier
  async update(
    id: string,
    updateDto: UpdateSupplierDto,
    tenantId: string,
  ): Promise<SupplierEntity> {
    const supplier = await this.findOne(id, tenantId);

    // Check if new name is already taken
    if (updateDto.name && updateDto.name !== supplier.name) {
      const existing = await this.supplierRepository.findOne({
        where: { name: updateDto.name, tenant_id: tenantId },
      });

      if (existing) {
        throw new BadRequestException('Supplier name already in use');
      }
    }

    await this.supplierRepository.update(id, updateDto);
    return this.findOne(id, tenantId);
  }

  // Delete supplier
  async remove(id: string, tenantId: string): Promise<{ success: boolean }> {
    const supplier = await this.findOne(id, tenantId);
    await this.supplierRepository.remove(supplier);
    return { success: true };
  }

  // Bulk delete suppliers
  async bulkDelete(
    ids: string[],
    tenantId: string,
  ): Promise<{ deleted: number }> {
    const result = await this.supplierRepository.delete({
      id: ids as any,
      tenant_id: tenantId,
    });

    return { deleted: result.affected || 0 };
  }
}
