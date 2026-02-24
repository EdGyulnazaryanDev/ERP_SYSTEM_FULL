import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.categoriesService.findAll(tenantId);
  }

  @Get('tree')
  getTree(@CurrentTenant() tenantId: string) {
    return this.categoriesService.getTree(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.categoriesService.findOne(id, tenantId);
  }

  @Post()
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.categoriesService.create(createCategoryDto, tenantId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.categoriesService.update(id, updateCategoryDto, tenantId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.categoriesService.delete(id, tenantId);
    return { message: 'Category deleted successfully' };
  }
}
