import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { WorkflowAutomationService } from './workflow-automation.service';
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

@Controller('workflow-automation')
@UseGuards(JwtAuthGuard)
export class WorkflowAutomationController {
  constructor(
    private readonly workflowAutomationService: WorkflowAutomationService,
  ) {}

  // ==================== WORKFLOW DEFINITION ENDPOINTS ====================

  @Post('workflows')
  createWorkflow(
    @Body() data: CreateWorkflowDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.workflowAutomationService.createWorkflow(
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Get('workflows')
  getWorkflows(@CurrentTenant() tenantId: string) {
    return this.workflowAutomationService.getWorkflows(tenantId);
  }

  @Get('workflows/:id')
  getWorkflow(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.workflowAutomationService.getWorkflow(id, tenantId);
  }

  @Put('workflows/:id')
  updateWorkflow(
    @Param('id') id: string,
    @Body() data: UpdateWorkflowDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.workflowAutomationService.updateWorkflow(
      id,
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Delete('workflows/:id')
  deleteWorkflow(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.workflowAutomationService.deleteWorkflow(id, tenantId);
  }

  @Post('workflows/:id/activate')
  activateWorkflow(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.workflowAutomationService.activateWorkflow(id, tenantId);
  }

  @Post('workflows/:id/deactivate')
  deactivateWorkflow(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.workflowAutomationService.deactivateWorkflow(id, tenantId);
  }

  // ==================== WORKFLOW EXECUTION ENDPOINTS ====================

  @Post('workflows/:id/execute')
  executeWorkflow(
    @Param('id') id: string,
    @Body() data: ExecuteWorkflowDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.workflowAutomationService.executeWorkflow(id, data, tenantId);
  }

  @Get('instances')
  getInstances(@CurrentTenant() tenantId: string) {
    return this.workflowAutomationService.getInstances(tenantId);
  }

  @Get('instances/:id')
  getInstance(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.workflowAutomationService.getInstance(id, tenantId);
  }

  @Post('instances/:id/cancel')
  cancelInstance(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.workflowAutomationService.cancelInstance(id, tenantId);
  }

  // ==================== TASK ENDPOINTS ====================

  @Get('tasks')
  getTasks(@CurrentTenant() tenantId: string) {
    return this.workflowAutomationService.getTasks(tenantId);
  }

  @Get('tasks/:id')
  getTask(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.workflowAutomationService.getTask(id, tenantId);
  }

  @Post('tasks/:id/complete')
  completeTask(
    @Param('id') id: string,
    @Body() data: CompleteTaskDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.workflowAutomationService.completeTask(
      id,
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Post('tasks/:id/assign')
  assignTask(
    @Param('id') id: string,
    @Body() data: AssignTaskDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.workflowAutomationService.assignTask(id, data, tenantId);
  }

  @Put('tasks/:id')
  updateTask(
    @Param('id') id: string,
    @Body() data: UpdateTaskDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.workflowAutomationService.updateTask(id, data, tenantId);
  }

  // ==================== AUTOMATION RULE ENDPOINTS ====================

  @Post('rules')
  createRule(
    @Body() data: CreateAutomationRuleDto,
    @Request() req: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.workflowAutomationService.createRule(
      data,
      req.user.userId,
      tenantId,
    );
  }

  @Get('rules')
  getRules(@CurrentTenant() tenantId: string) {
    return this.workflowAutomationService.getRules(tenantId);
  }

  @Get('rules/:id')
  getRule(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.workflowAutomationService.getRule(id, tenantId);
  }

  @Put('rules/:id')
  updateRule(
    @Param('id') id: string,
    @Body() data: UpdateAutomationRuleDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.workflowAutomationService.updateRule(id, data, tenantId);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.workflowAutomationService.deleteRule(id, tenantId);
  }

  @Post('rules/:id/execute')
  executeRule(
    @Param('id') id: string,
    @Body() data: ExecuteAutomationDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.workflowAutomationService.executeRule(id, data, tenantId);
  }

  // ==================== LOG ENDPOINTS ====================

  @Get('logs')
  getLogs(@CurrentTenant() tenantId: string) {
    return this.workflowAutomationService.getLogs(tenantId);
  }
}
