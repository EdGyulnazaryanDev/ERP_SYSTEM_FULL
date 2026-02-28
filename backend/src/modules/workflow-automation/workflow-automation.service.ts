import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WorkflowDefinitionEntity,
  WorkflowStatus,
} from './entities/workflow-definition.entity';
import { WorkflowStepEntity } from './entities/workflow-step.entity';
import {
  WorkflowInstanceEntity,
  InstanceStatus,
} from './entities/workflow-instance.entity';
import {
  WorkflowTaskEntity,
  TaskStatus,
} from './entities/workflow-task.entity';
import {
  AutomationRuleEntity,
  RuleStatus,
} from './entities/automation-rule.entity';
import {
  AutomationLogEntity,
  LogStatus,
} from './entities/automation-log.entity';
import type {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  ExecuteWorkflowDto,
} from './dto/create-workflow.dto';
import type {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  ExecuteAutomationDto,
} from './dto/create-automation-rule.dto';
import type {
  CompleteTaskDto,
  AssignTaskDto,
  UpdateTaskDto,
} from './dto/create-task.dto';

@Injectable()
export class WorkflowAutomationService {
  constructor(
    @InjectRepository(WorkflowDefinitionEntity)
    private workflowRepo: Repository<WorkflowDefinitionEntity>,
    @InjectRepository(WorkflowStepEntity)
    private stepRepo: Repository<WorkflowStepEntity>,
    @InjectRepository(WorkflowInstanceEntity)
    private instanceRepo: Repository<WorkflowInstanceEntity>,
    @InjectRepository(WorkflowTaskEntity)
    private taskRepo: Repository<WorkflowTaskEntity>,
    @InjectRepository(AutomationRuleEntity)
    private ruleRepo: Repository<AutomationRuleEntity>,
    @InjectRepository(AutomationLogEntity)
    private logRepo: Repository<AutomationLogEntity>,
  ) {}

  // ==================== WORKFLOW DEFINITION METHODS ====================

  async createWorkflow(
    data: CreateWorkflowDto,
    userId: string,
    tenantId: string,
  ): Promise<WorkflowDefinitionEntity> {
    const workflow = this.workflowRepo.create({
      ...data,
      created_by: userId,
      tenant_id: tenantId,
    });

    const savedWorkflow = await this.workflowRepo.save(workflow);

    if (data.steps && data.steps.length > 0) {
      for (const stepData of data.steps) {
        const step = this.stepRepo.create({
          ...stepData,
          workflow_id: savedWorkflow.id,
          tenant_id: tenantId,
        });
        await this.stepRepo.save(step);
      }
    }

    return this.getWorkflow(savedWorkflow.id, tenantId);
  }

  async getWorkflows(tenantId: string): Promise<WorkflowDefinitionEntity[]> {
    return this.workflowRepo.find({
      where: { tenant_id: tenantId },
      relations: ['steps'],
      order: { created_at: 'DESC' },
    });
  }

  async getWorkflow(
    id: string,
    tenantId: string,
  ): Promise<WorkflowDefinitionEntity> {
    const workflow = await this.workflowRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['steps'],
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return workflow;
  }

  async updateWorkflow(
    id: string,
    data: UpdateWorkflowDto,
    userId: string,
    tenantId: string,
  ): Promise<WorkflowDefinitionEntity> {
    const workflow = await this.getWorkflow(id, tenantId);

    Object.assign(workflow, {
      ...data,
      updated_by: userId,
    });

    return this.workflowRepo.save(workflow);
  }

  async deleteWorkflow(id: string, tenantId: string): Promise<void> {
    const workflow = await this.getWorkflow(id, tenantId);

    if (workflow.status === WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active workflow');
    }

    await this.workflowRepo.remove(workflow);
  }

  async activateWorkflow(
    id: string,
    tenantId: string,
  ): Promise<WorkflowDefinitionEntity> {
    const workflow = await this.getWorkflow(id, tenantId);

    if (workflow.steps.length === 0) {
      throw new BadRequestException('Workflow must have at least one step');
    }

    workflow.status = WorkflowStatus.ACTIVE;
    return this.workflowRepo.save(workflow);
  }

  async deactivateWorkflow(
    id: string,
    tenantId: string,
  ): Promise<WorkflowDefinitionEntity> {
    const workflow = await this.getWorkflow(id, tenantId);
    workflow.status = WorkflowStatus.INACTIVE;
    return this.workflowRepo.save(workflow);
  }

  // ==================== WORKFLOW EXECUTION METHODS ====================

  async executeWorkflow(
    workflowId: string,
    data: ExecuteWorkflowDto,
    tenantId: string,
  ): Promise<WorkflowInstanceEntity> {
    const workflow = await this.getWorkflow(workflowId, tenantId);

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Workflow is not active');
    }

    const instance = this.instanceRepo.create({
      workflow_id: workflowId,
      input_data: data.input_data,
      triggered_by: data.triggered_by,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      started_at: new Date(),
      tenant_id: tenantId,
    });

    const savedInstance = await this.instanceRepo.save(instance);

    // Update workflow execution count
    workflow.execution_count = workflow.execution_count + 1;
    workflow.last_executed_at = new Date();
    await this.workflowRepo.save(workflow);

    // Start workflow execution (async)
    this.processWorkflow(savedInstance.id, tenantId).catch((error) => {
      console.error('Workflow execution failed:', error);
    });

    return savedInstance;
  }

  private async processWorkflow(
    instanceId: string,
    tenantId: string,
  ): Promise<void> {
    const instance = await this.instanceRepo.findOne({
      where: { id: instanceId, tenant_id: tenantId },
      relations: ['workflow', 'workflow.steps'],
    });

    if (!instance) return;

    try {
      const steps = instance.workflow.steps.sort((a, b) => a.sequence - b.sequence);

      for (const step of steps) {
        instance.current_step_id = step.id;
        await this.instanceRepo.save(instance);

        // Execute step based on type
        await this.executeStep(step, instance, tenantId);

        // Check if workflow should continue
        if (instance.status !== InstanceStatus.RUNNING) {
          break;
        }
      }

      // Mark as completed
      instance.status = InstanceStatus.COMPLETED;
      instance.completed_at = new Date();
      instance.duration_seconds = Math.floor(
        (instance.completed_at.getTime() - instance.started_at.getTime()) / 1000,
      );

      await this.instanceRepo.save(instance);
    } catch (error) {
      instance.status = InstanceStatus.FAILED;
      instance.error_message = error.message;
      instance.completed_at = new Date();
      await this.instanceRepo.save(instance);
    }
  }

  private async executeStep(
    step: WorkflowStepEntity,
    instance: WorkflowInstanceEntity,
    tenantId: string,
  ): Promise<void> {
    // Execute step based on type
    switch (step.step_type) {
      case 'task':
      case 'approval':
        await this.createTask(step, instance, tenantId);
        break;
      case 'notification':
        await this.sendNotification(step, instance);
        break;
      case 'email':
        await this.sendEmail(step, instance);
        break;
      case 'webhook':
        await this.callWebhook(step, instance);
        break;
      case 'delay':
        await this.executeDelay(step);
        break;
      default:
        // Skip unknown step types
        break;
    }
  }

  private async createTask(
    step: WorkflowStepEntity,
    instance: WorkflowInstanceEntity,
    tenantId: string,
  ): Promise<void> {
    const task = this.taskRepo.create({
      instance_id: instance.id,
      step_id: step.id,
      task_name: step.name,
      description: step.description,
      task_data: step.config,
      assigned_to: step.config?.assigned_to,
      assigned_role: step.config?.assigned_role,
      priority: step.config?.priority || 'normal',
      tenant_id: tenantId,
    });

    await this.taskRepo.save(task);

    // If approval required, pause workflow
    if (step.step_type === 'approval') {
      instance.status = InstanceStatus.PAUSED;
      await this.instanceRepo.save(instance);
    }
  }

  private async sendNotification(
    step: WorkflowStepEntity,
    instance: WorkflowInstanceEntity,
  ): Promise<void> {
    // Implement notification logic
    console.log('Sending notification:', step.config);
  }

  private async sendEmail(
    step: WorkflowStepEntity,
    instance: WorkflowInstanceEntity,
  ): Promise<void> {
    // Implement email logic
    console.log('Sending email:', step.config);
  }

  private async callWebhook(
    step: WorkflowStepEntity,
    instance: WorkflowInstanceEntity,
  ): Promise<void> {
    // Implement webhook logic
    console.log('Calling webhook:', step.config);
  }

  private async executeDelay(step: WorkflowStepEntity): Promise<void> {
    const delayMs = step.config?.delay_ms || 1000;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  async getInstances(tenantId: string): Promise<WorkflowInstanceEntity[]> {
    return this.instanceRepo.find({
      where: { tenant_id: tenantId },
      relations: ['workflow', 'tasks'],
      order: { created_at: 'DESC' },
    });
  }

  async getInstance(
    id: string,
    tenantId: string,
  ): Promise<WorkflowInstanceEntity> {
    const instance = await this.instanceRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['workflow', 'tasks'],
    });

    if (!instance) {
      throw new NotFoundException('Workflow instance not found');
    }

    return instance;
  }

  async cancelInstance(
    id: string,
    tenantId: string,
  ): Promise<WorkflowInstanceEntity> {
    const instance = await this.getInstance(id, tenantId);

    if (instance.status === InstanceStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed workflow');
    }

    instance.status = InstanceStatus.CANCELLED;
    instance.completed_at = new Date();

    return this.instanceRepo.save(instance);
  }

  // ==================== TASK METHODS ====================

  async getTasks(tenantId: string): Promise<WorkflowTaskEntity[]> {
    return this.taskRepo.find({
      where: { tenant_id: tenantId },
      relations: ['instance', 'instance.workflow'],
      order: { created_at: 'DESC' },
    });
  }

  async getTask(id: string, tenantId: string): Promise<WorkflowTaskEntity> {
    const task = await this.taskRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['instance'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async completeTask(
    id: string,
    data: CompleteTaskDto,
    userId: string,
    tenantId: string,
  ): Promise<WorkflowTaskEntity> {
    const task = await this.getTask(id, tenantId);

    task.status = data.status;
    task.result_data = data.result_data;
    if (data.comments) {
      task.comments = data.comments;
    }
    task.completed_by = userId;
    task.completed_at = new Date();

    const savedTask = await this.taskRepo.save(task);

    // Resume workflow if it was paused
    const instance = await this.getInstance(task.instance_id, tenantId);
    if (instance.status === InstanceStatus.PAUSED) {
      instance.status = InstanceStatus.RUNNING;
      await this.instanceRepo.save(instance);

      // Continue workflow execution
      this.processWorkflow(instance.id, tenantId).catch((error) => {
        console.error('Workflow continuation failed:', error);
      });
    }

    return savedTask;
  }

  async assignTask(
    id: string,
    data: AssignTaskDto,
    tenantId: string,
  ): Promise<WorkflowTaskEntity> {
    const task = await this.getTask(id, tenantId);

    task.assigned_to = data.assigned_to;
    if (data.comments) {
      task.comments = task.comments
        ? `${task.comments}\n${data.comments}`
        : data.comments;
    }

    return this.taskRepo.save(task);
  }

  async updateTask(
    id: string,
    data: UpdateTaskDto,
    tenantId: string,
  ): Promise<WorkflowTaskEntity> {
    const task = await this.getTask(id, tenantId);
    Object.assign(task, data);
    return this.taskRepo.save(task);
  }

  // ==================== AUTOMATION RULE METHODS ====================

  async createRule(
    data: CreateAutomationRuleDto,
    userId: string,
    tenantId: string,
  ): Promise<AutomationRuleEntity> {
    const rule = this.ruleRepo.create({
      ...data,
      created_by: userId,
      tenant_id: tenantId,
    });

    return this.ruleRepo.save(rule);
  }

  async getRules(tenantId: string): Promise<AutomationRuleEntity[]> {
    return this.ruleRepo.find({
      where: { tenant_id: tenantId },
      order: { priority: 'DESC', created_at: 'DESC' },
    });
  }

  async getRule(
    id: string,
    tenantId: string,
  ): Promise<AutomationRuleEntity> {
    const rule = await this.ruleRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }

    return rule;
  }

  async updateRule(
    id: string,
    data: UpdateAutomationRuleDto,
    tenantId: string,
  ): Promise<AutomationRuleEntity> {
    const rule = await this.getRule(id, tenantId);
    Object.assign(rule, data);
    return this.ruleRepo.save(rule);
  }

  async deleteRule(id: string, tenantId: string): Promise<void> {
    const rule = await this.getRule(id, tenantId);
    await this.ruleRepo.remove(rule);
  }

  async executeRule(
    ruleId: string,
    data: ExecuteAutomationDto,
    tenantId: string,
  ): Promise<void> {
    const rule = await this.getRule(ruleId, tenantId);

    if (rule.status !== RuleStatus.ACTIVE) {
      throw new BadRequestException('Rule is not active');
    }

    const startTime = Date.now();

    try {
      // Execute action based on type
      await this.executeAction(rule, data.entity_data, data.context);

      // Log success
      await this.logExecution(
        rule,
        data.entity_data,
        LogStatus.SUCCESS,
        Date.now() - startTime,
        tenantId,
      );

      // Update rule stats
      rule.execution_count = rule.execution_count + 1;
      rule.last_executed_at = new Date();
      await this.ruleRepo.save(rule);
    } catch (error) {
      // Log failure
      await this.logExecution(
        rule,
        data.entity_data,
        LogStatus.FAILED,
        Date.now() - startTime,
        tenantId,
        error.message,
      );

      throw error;
    }
  }

  private async executeAction(
    rule: AutomationRuleEntity,
    entityData: any,
    context: any,
  ): Promise<void> {
    // Implement action execution based on action_type
    console.log('Executing action:', rule.action_type, rule.action_config);
  }

  private async logExecution(
    rule: AutomationRuleEntity,
    entityData: any,
    status: LogStatus,
    executionTime: number,
    tenantId: string,
    errorMessage?: string,
  ): Promise<void> {
    const log = this.logRepo.create({
      rule_id: rule.id,
      entity_type: rule.entity_type,
      action_type: rule.action_type,
      status,
      input_data: entityData,
      execution_time_ms: executionTime,
      error_message: errorMessage,
      executed_at: new Date(),
      tenant_id: tenantId,
    });

    await this.logRepo.save(log);
  }

  async getLogs(tenantId: string): Promise<AutomationLogEntity[]> {
    return this.logRepo.find({
      where: { tenant_id: tenantId },
      order: { executed_at: 'DESC' },
    });
  }
}
