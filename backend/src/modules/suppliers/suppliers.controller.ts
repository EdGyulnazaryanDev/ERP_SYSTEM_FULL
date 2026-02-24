import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuppliersService } from './suppliers.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  // Create supplier
  @Post()
  create(
    @Body() createDto: CreateSupplierDto,
    @CurrentTenant() tenantId: string,
  ) {
    if (!createDto.name) {
      throw new BadRequestException('Supplier name is required');
    }
    return this.suppliersService.create(createDto, tenantId);
  }

  // Get all suppliers with pagination and search
  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('search') search?: string,
    @CurrentTenant() tenantId?: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.suppliersService.findAllPaginated(
      tenantId,
      parseInt(page, 10),
      parseInt(pageSize, 10),
      search,
    );
  }

  // Get supplier names (for dropdowns)
  @Get('names/all')
  getSupplierNames(@CurrentTenant() tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.suppliersService.findSupplierNames(tenantId);
  }

  // Get single supplier
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.suppliersService.findOne(id, tenantId);
  }

  // Update supplier
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSupplierDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.suppliersService.update(id, updateDto, tenantId);
  }

  // Delete supplier
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.suppliersService.remove(id, tenantId);
  }

  // Bulk delete suppliers
  @Post('bulk-delete')
  bulkDelete(@Body('ids') ids: string[], @CurrentTenant() tenantId: string) {
    return this.suppliersService.bulkDelete(ids, tenantId);
  }
}
