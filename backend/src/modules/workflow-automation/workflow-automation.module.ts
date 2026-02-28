import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowAutomationController } from './workflow-automation.controller';
import { WorkflowAutomationService } from './workflow-automation.service';
import { WorkflowDefinitionEntity } from './entities/workflow-definition.entity';
import { WorkflowStepEntity } from './entities/workflow-step.entity';
import { WorkflowInstanceEntity } from './entities/workflow-instance.entity';
import { WorkflowTaskEntity } from './entities/workflow-task.entity';
import { AutomationRuleEntity } from './entities/automation-rule.entity';
import { AutomationLogEntity } from './entities/automation-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowDefinitionEntity,
      WorkflowStepEntity,
      WorkflowInstanceEntity,
      WorkflowTaskEntity,
      AutomationRuleEntity,
      AutomationLogEntity,
    ]),
  ],
  controllers: [WorkflowAutomationController],
  providers: [WorkflowAutomationService],
  exports: [WorkflowAutomationService],
})
export class WorkflowAutomationModule {}
