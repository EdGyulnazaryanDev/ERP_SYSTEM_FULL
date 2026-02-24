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
  BadRequestException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type {
  CreateProductDto,
  UpdateProductDto,
  ProductFilters,
} from './dtos/product.dto';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('categories')
  async getCategories(@CurrentTenant() tenantId: string) {
    return this.productsService.getCategories(tenantId);
  }

  @Get('suppliers')
  async getSuppliers(@CurrentTenant() tenantId: string) {
    return this.productsService.getSuppliers(tenantId);
  }

  @Get('low-stock')
  async getLowStockProducts(@CurrentTenant() tenantId: string) {
    return this.productsService.getLowStockProducts(tenantId);
  }

  @Get('stats')
  async getProductStats(@CurrentTenant() tenantId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.productsService.getProductStats(tenantId);
  }

  @Get()
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('supplier') supplier?: string,
    @Query('is_active') is_active?: string,
    @Query('search') search?: string,
  ) {
    const filters: ProductFilters = {};
    if (category) filters.category = category;
    if (supplier) filters.supplier = supplier;
    if (is_active !== undefined) filters.is_active = is_active === 'true';
    if (search) filters.search = search;

    return this.productsService.findAll(
      tenantId,
      filters,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.productsService.findOne(id, tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() data: CreateProductDto,
    @CurrentTenant() tenantId: string,
  ) {
    if (!data.name || !data.sku) {
      throw new BadRequestException('Name and SKU are required');
    }

    return this.productsService.create(data, tenantId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateProductDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.productsService.update(id, tenantId, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.productsService.delete(id, tenantId);
  }

  @Post('bulk-delete')
  async bulkDelete(
    @Body() body: { ids: string[] },
    @CurrentTenant() tenantId: string,
  ) {
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      throw new BadRequestException(
        'IDs array is required and must not be empty',
      );
    }

    const count = await this.productsService.bulkDelete(body.ids, tenantId);
    return {
      message: `${count} products deleted successfully`,
      count,
    };
  }
}
