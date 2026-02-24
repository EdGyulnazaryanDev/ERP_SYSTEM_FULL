import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ProductEntity } from './entities/product.entity';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductFilters,
} from './dtos/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private productRepo: Repository<ProductEntity>,
  ) {}

  async findAll(
    tenantId: string,
    filters?: ProductFilters,
    page = 1,
    limit = 50,
  ) {
    const offset = (page - 1) * limit;

    // Build where clause
    const where: FindOptionsWhere<ProductEntity> = { tenant_id: tenantId };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.supplier) {
      where.supplier = filters.supplier;
    }

    if (filters?.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    if (filters?.search) {
      // Use OR for search across multiple fields
      const queryBuilder = this.productRepo
        .createQueryBuilder('product')
        .where('product.tenant_id = :tenantId', { tenantId })
        .andWhere(
          '(product.name ILIKE :search OR product.sku ILIKE :search OR product.description ILIKE :search)',
          { search: `%${filters.search}%` },
        );

      if (filters.category) {
        queryBuilder.andWhere('product.category = :category', {
          category: filters.category,
        });
      }
      if (filters.supplier) {
        queryBuilder.andWhere('product.supplier = :supplier', {
          supplier: filters.supplier,
        });
      }
      if (filters.is_active !== undefined) {
        queryBuilder.andWhere('product.is_active = :is_active', {
          is_active: filters.is_active,
        });
      }

      const [data, total] = await queryBuilder
        .orderBy('product.created_at', 'DESC')
        .take(limit)
        .skip(offset)
        .getManyAndCount();

      return { data, total, page, limit };
    }

    const [data, total] = await this.productRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string, tenantId: string) {
    const product = await this.productRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findBySku(sku: string, tenantId: string) {
    return this.productRepo.findOne({
      where: { sku, tenant_id: tenantId },
    });
  }

  async create(data: CreateProductDto, tenantId: string) {
    // Check if SKU already exists
    const existing = await this.findBySku(data.sku, tenantId);
    if (existing) {
      throw new ConflictException('Product with this SKU already exists');
    }

    // Validate prices
    if (data.cost_price < 0 || data.selling_price < 0) {
      throw new BadRequestException('Prices cannot be negative');
    }

    if (data.selling_price < data.cost_price) {
      throw new BadRequestException(
        'Selling price must be greater than or equal to cost price',
      );
    }

    const product = this.productRepo.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.productRepo.save(product);
  }

  async update(id: string, tenantId: string, data: UpdateProductDto) {
    const product = await this.findOne(id, tenantId);

    // If SKU is being updated, check for conflicts
    if (data.sku && data.sku !== product.sku) {
      const existing = await this.findBySku(data.sku, tenantId);
      if (existing) {
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    // Validate prices if provided
    const costPrice = data.cost_price ?? product.cost_price;
    const sellingPrice = data.selling_price ?? product.selling_price;

    if (costPrice < 0 || sellingPrice < 0) {
      throw new BadRequestException('Prices cannot be negative');
    }

    if (sellingPrice < costPrice) {
      throw new BadRequestException(
        'Selling price must be greater than or equal to cost price',
      );
    }

    Object.assign(product, data);
    return this.productRepo.save(product);
  }

  async delete(id: string, tenantId: string) {
    const product = await this.findOne(id, tenantId);
    await this.productRepo.remove(product);
  }

  async bulkDelete(ids: string[], tenantId: string) {
    const result = await this.productRepo.delete({
      id: ids as any,
      tenant_id: tenantId,
    });

    return result.affected || 0;
  }

  async getCategories(tenantId: string): Promise<string[]> {
    const products = await this.productRepo
      .createQueryBuilder('product')
      .select('DISTINCT product.category', 'category')
      .where('product.tenant_id = :tenantId', { tenantId })
      .andWhere('product.category IS NOT NULL')
      .orderBy('product.category', 'ASC')
      .getRawMany();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return products.map((p) => p.category).filter(Boolean);
  }

  async getSuppliers(tenantId: string): Promise<string[]> {
    const products = await this.productRepo
      .createQueryBuilder('product')
      .select('DISTINCT product.supplier', 'supplier')
      .where('product.tenant_id = :tenantId', { tenantId })
      .andWhere('product.supplier IS NOT NULL')
      .orderBy('product.supplier', 'ASC')
      .getRawMany();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return products.map((p) => p.supplier).filter(Boolean);
  }

  async getLowStockProducts(tenantId: string) {
    return this.productRepo
      .find({
        where: [
          {
            tenant_id: tenantId,
            is_active: true,
          },
        ],
        order: { created_at: 'DESC' },
      })
      .then((products) =>
        products.filter((p) => p.quantity_in_stock <= p.reorder_level),
      );
  }

  async getProductStats(tenantId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const stats = await this.productRepo
      .createQueryBuilder('product')
      .select('COUNT(product.id)', 'total_products')
      .addSelect('SUM(product.quantity_in_stock)', 'total_stock_value')
      .addSelect(
        'COUNT(CASE WHEN product.is_active = true THEN 1 END)',
        'active_products',
      )
      .addSelect(
        'COUNT(CASE WHEN product.quantity_in_stock <= product.reorder_level THEN 1 END)',
        'low_stock_count',
      )
      .where('product.tenant_id = :tenantId', { tenantId })
      .getRawOne();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return stats;
  }
}
