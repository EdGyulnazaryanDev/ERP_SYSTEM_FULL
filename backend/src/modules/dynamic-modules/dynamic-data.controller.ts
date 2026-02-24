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
} from '@nestjs/common';
import { DynamicDataService } from './dynamic-data.service';
import { DynamicModulesService } from './dynamic-modules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { ModuleField } from './types';

@UseGuards(JwtAuthGuard)
@Controller('dynamic-modules/:moduleName/data')
export class DynamicDataController {
  constructor(
    private readonly dataService: DynamicDataService,
    private readonly modulesService: DynamicModulesService,
  ) {}

  @Get()
  async findAll(
    @Param('moduleName') moduleName: string,
    @CurrentTenant() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query() filters?: Record<string, any>,
  ) {
    await this.modulesService.verifyModuleAccess(moduleName, tenantId);

    // Remove pagination params from filters
    const { ...cleanFilters } = filters || {};

    return this.dataService.findAll(
      moduleName,
      tenantId,
      cleanFilters,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get(':id')
  async findOne(
    @Param('moduleName') moduleName: string,
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.modulesService.verifyModuleAccess(moduleName, tenantId);
    return this.dataService.findOne(moduleName, id, tenantId);
  }

  @Post()
  async create(
    @Param('moduleName') moduleName: string,
    @Body() data: Record<string, any>,
    @CurrentTenant() tenantId: string,
  ) {
    const module = await this.modulesService.verifyModuleAccess(
      moduleName,
      tenantId,
    );

    // Validate data
    this.validateData(data, module.fields);

    return this.dataService.create(moduleName, data, tenantId);
  }

  @Put(':id')
  async update(
    @Param('moduleName') moduleName: string,
    @Param('id') id: string,
    @Body() data: Record<string, any>,
    @CurrentTenant() tenantId: string,
  ) {
    const module = await this.modulesService.verifyModuleAccess(
      moduleName,
      tenantId,
    );

    // Validate data
    this.validateData(data, module.fields, false);

    return this.dataService.update(moduleName, id, data, tenantId);
  }

  @Delete(':id')
  async delete(
    @Param('moduleName') moduleName: string,
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.modulesService.verifyModuleAccess(moduleName, tenantId);
    await this.dataService.delete(moduleName, id, tenantId);
    return { message: 'Record deleted successfully' };
  }

  @Post('bulk-delete')
  async bulkDelete(
    @Param('moduleName') moduleName: string,
    @Body() body: { ids: string[] },
    @CurrentTenant() tenantId: string,
  ) {
    await this.modulesService.verifyModuleAccess(moduleName, tenantId);
    const count = await this.dataService.bulkDelete(
      moduleName,
      body.ids,
      tenantId,
    );
    return { message: `${count} records deleted successfully`, count };
  }

  private validateData(
    data: Record<string, any>,
    fields: ModuleField[],
    isCreate = true,
  ): void {
    fields.forEach((field) => {
      const value = data[field.name];

      // Check required fields (only on create)
      if (
        isCreate &&
        field.required &&
        (value === undefined || value === null || value === '')
      ) {
        throw new BadRequestException(`${field.displayName} is required`);
      }

      // Type validation (if value is provided)
      if (value !== undefined && value !== null && value !== '') {
        this.validateFieldType(value, field);
      }
    });
  }

  private validateFieldType(value: any, field: ModuleField): void {
    switch (field.type) {
      case 'number':
      case 'integer':
      case 'decimal':
        if (isNaN(Number(value))) {
          throw new BadRequestException(
            `${field.displayName} must be a number`,
          );
        }
        break;

      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new BadRequestException(
            `${field.displayName} must be a valid email`,
          );
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          throw new BadRequestException(
            `${field.displayName} must be a valid URL`,
          );
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new BadRequestException(
            `${field.displayName} must be true or false`,
          );
        }
        break;

      case 'date':
      case 'datetime':
        if (isNaN(Date.parse(value))) {
          throw new BadRequestException(
            `${field.displayName} must be a valid date`,
          );
        }
        break;
    }
  }
}
