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
import { DynamicModulesService } from './dynamic-modules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import type { ModuleField } from './types';

@UseGuards(JwtAuthGuard)
@Controller('dynamic-modules')
export class DynamicModulesController {
  constructor(private readonly modulesService: DynamicModulesService) {}

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.modulesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.modulesService.findOne(id, tenantId);
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      displayName: string;
      description?: string;
      icon?: string;
      color?: string;
      fields: ModuleField[];
    },
    @CurrentTenant() tenantId: string,
  ) {
    return this.modulesService.create(body, tenantId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      displayName?: string;
      description?: string;
      icon?: string;
      color?: string;
    },
    @CurrentTenant() tenantId: string,
  ) {
    return this.modulesService.update(id, body, tenantId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.modulesService.delete(id, tenantId);
    return { message: 'Module deleted successfully' };
  }
}
