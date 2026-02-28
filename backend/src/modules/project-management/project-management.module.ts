import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectManagementController } from './project-management.controller';
import { ProjectManagementService } from './project-management.service';
import { ProjectEntity } from './entities/project.entity';
import { TaskEntity } from './entities/task.entity';
import { TaskDependencyEntity } from './entities/task-dependency.entity';
import { MilestoneEntity } from './entities/milestone.entity';
import { TimesheetEntity } from './entities/timesheet.entity';
import { TimesheetEntryEntity } from './entities/timesheet-entry.entity';
import { ProjectResourceEntity } from './entities/project-resource.entity';
import { ProjectBudgetEntity } from './entities/project-budget.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectEntity,
      TaskEntity,
      TaskDependencyEntity,
      MilestoneEntity,
      TimesheetEntity,
      TimesheetEntryEntity,
      ProjectResourceEntity,
      ProjectBudgetEntity,
    ]),
  ],
  controllers: [ProjectManagementController],
  providers: [ProjectManagementService],
  exports: [ProjectManagementService],
})
export class ProjectManagementModule {}
