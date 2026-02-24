import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleDefinitionEntity } from './entities/module-definition.entity';
import { DynamicSchemaService } from './dynamic-schema.service';
import type { ModuleField } from './types';

@Injectable()
export class DynamicModulesService {
  constructor(
    @InjectRepository(ModuleDefinitionEntity)
    private moduleRepo: Repository<ModuleDefinitionEntity>,
    private dynamicSchemaService: DynamicSchemaService,
  ) {}

  async findAll(tenantId: string): Promise<ModuleDefinitionEntity[]> {
    return this.moduleRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<ModuleDefinitionEntity> {
    const module = await this.moduleRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    return module;
  }

  async findByName(
    name: string,
    tenantId: string,
  ): Promise<ModuleDefinitionEntity> {
    const module = await this.moduleRepo.findOne({
      where: { name, tenant_id: tenantId },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    return module;
  }

  async create(
    data: {
      name: string;
      displayName: string;
      description?: string;
      icon?: string;
      color?: string;
      fields: ModuleField[];
    },
    tenantId: string,
  ): Promise<ModuleDefinitionEntity> {
    // Validate module name (alphanumeric and underscore only)
    if (!/^[a-z0-9_]+$/.test(data.name)) {
      throw new BadRequestException(
        'Module name must contain only lowercase letters, numbers, and underscores',
      );
    }

    // Check if module already exists
    const existing = await this.moduleRepo.findOne({
      where: { name: data.name, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Module with this name already exists');
    }

    // Validate fields
    this.validateFields(data.fields);

    // Create module definition
    const module = this.moduleRepo.create({
      ...data,
      tenant_id: tenantId,
      tableCreated: false,
    });

    const savedModule = await this.moduleRepo.save(module);

    // Create database table
    try {
      await this.dynamicSchemaService.createModuleTable(
        savedModule.name,
        savedModule.fields,
      );

      // Mark table as created
      savedModule.tableCreated = true;
      await this.moduleRepo.save(savedModule);
    } catch (error) {
      // Rollback if table creation fails
      await this.moduleRepo.remove(savedModule);
      throw new BadRequestException(
        `Failed to create table: ${error.message}`,
      );
    }

    return savedModule;
  }

  async update(
    id: string,
    data: {
      displayName?: string;
      description?: string;
      icon?: string;
      color?: string;
    },
    tenantId: string,
  ): Promise<ModuleDefinitionEntity> {
    const module = await this.findOne(id, tenantId);

    Object.assign(module, data);
    return this.moduleRepo.save(module);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const module = await this.findOne(id, tenantId);

    // Drop database table
    try {
      await this.dynamicSchemaService.dropModuleTable(module.name);
    } catch (error) {
      console.error('Failed to drop table:', error);
      // Continue with deletion even if table drop fails
    }

    // Delete module definition
    await this.moduleRepo.remove(module);
  }

  async verifyModuleAccess(
    moduleName: string,
    tenantId: string,
  ): Promise<ModuleDefinitionEntity> {
    return this.findByName(moduleName, tenantId);
  }

  private validateFields(fields: ModuleField[]): void {
    if (!fields || fields.length === 0) {
      throw new BadRequestException('Module must have at least one field');
    }

    const fieldNames = new Set<string>();

    fields.forEach((field) => {
      // Check for duplicate field names
      if (fieldNames.has(field.name)) {
        throw new BadRequestException(
          `Duplicate field name: ${field.name}`,
        );
      }
      fieldNames.add(field.name);

      // Validate field name
      if (!/^[a-z0-9_]+$/.test(field.name)) {
        throw new BadRequestException(
          `Field name "${field.name}" must contain only lowercase letters, numbers, and underscores`,
        );
      }

      // Reserved field names
      const reserved = ['id', 'tenant_id', 'created_at', 'updated_at'];
      if (reserved.includes(field.name)) {
        throw new BadRequestException(
          `Field name "${field.name}" is reserved`,
        );
      }

      // Validate required fields
      if (!field.displayName) {
        throw new BadRequestException(
          `Field "${field.name}" must have a display name`,
        );
      }
    });
  }
}
