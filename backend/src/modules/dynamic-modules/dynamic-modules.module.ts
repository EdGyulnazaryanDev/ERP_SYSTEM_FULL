import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamicModulesController } from './dynamic-modules.controller';
import { DynamicDataController } from './dynamic-data.controller';
import { DynamicModulesService } from './dynamic-modules.service';
import { DynamicDataService } from './dynamic-data.service';
import { DynamicSchemaService } from './dynamic-schema.service';
import { ModuleDefinitionEntity } from './entities/module-definition.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ModuleDefinitionEntity])],
  controllers: [DynamicModulesController, DynamicDataController],
  providers: [
    DynamicModulesService,
    DynamicDataService,
    DynamicSchemaService,
  ],
  exports: [DynamicModulesService, DynamicDataService],
})
export class DynamicModulesModule {}
