import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ProjectManagementService } from './project-management.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/create-project.dto';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';
import { CreateTimesheetDto, UpdateTimesheetDto, ApproveTimesheetDto, RejectTimesheetDto } from './dto/create-timesheet.dto';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/create-milestone.dto';
import { CreateResourceDto, UpdateResourceDto } from './dto/create-resource.dto';

@Controller('project-management')
@UseGuards(JwtAuthGuard)
export class ProjectManagementController {
  constructor(private readonly projectManagementService: ProjectManagementService) {}

  // ─── Projects ────────────────────────────────────────────────────────────────

  @Get('projects')
  @RequirePermission('project', 'read')
  findAllProjects(@CurrentTenant() tenantId: string) {
    return this.projectManagementService.findAllProjects(tenantId);
  }

  // NOTE: specific sub-routes must come BEFORE /:id to avoid route conflicts
  @Get('projects/manager/:managerId')
  @RequirePermission('project', 'read')
  getProjectsByManager(@Param('managerId') managerId: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.getProjectsByManager(managerId, tenantId);
  }

  @Get('projects/:id')
  @RequirePermission('project', 'read')
  findOneProject(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.findOneProject(id, tenantId);
  }

  @Post('projects')
  @RequirePermission('project', 'create')
  createProject(@Body() data: CreateProjectDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.createProject(data, tenantId);
  }

  @Put('projects/:id')
  @RequirePermission('project', 'update')
  updateProject(@Param('id') id: string, @Body() data: UpdateProjectDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.updateProject(id, data, tenantId);
  }

  @Delete('projects/:id')
  @RequirePermission('project', 'delete')
  async deleteProject(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.projectManagementService.deleteProject(id, tenantId);
    return { message: 'Project deleted successfully' };
  }

  @Post('projects/:id/ai-generate')
  @RequirePermission('project', 'update')
  async aiGenerateProjectPlan(
    @Param('id') id: string,
    @Body() body: { prompt: string },
    @CurrentTenant() tenantId: string
  ) {
    return this.projectManagementService.generateAIPlan(id, body.prompt, tenantId);
  }

  @Get('projects/:projectId/gantt')
  @RequirePermission('project', 'read')
  getGanttChartData(@Param('projectId') projectId: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.getGanttChartData(projectId, tenantId);
  }

  @Get('projects/:projectId/budget')
  @RequirePermission('project', 'read')
  getProjectBudget(@Param('projectId') projectId: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.getProjectBudget(projectId, tenantId);
  }

  // ─── Tasks ───────────────────────────────────────────────────────────────────

  @Get('tasks')
  @RequirePermission('task', 'read')
  findAllTasks(@CurrentTenant() tenantId: string, @Query('projectId') projectId?: string) {
    return this.projectManagementService.findAllTasks(tenantId, projectId);
  }

  @Get('tasks/assignee/:assigneeId')
  @RequirePermission('task', 'read')
  getTasksByAssignee(@Param('assigneeId') assigneeId: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.getTasksByAssignee(assigneeId, tenantId);
  }

  @Get('tasks/:id')
  @RequirePermission('task', 'read')
  findOneTask(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.findOneTask(id, tenantId);
  }

  @Post('tasks')
  @RequirePermission('task', 'create')
  createTask(@Body() data: CreateTaskDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.createTask(data, tenantId);
  }

  @Put('tasks/:id')
  @RequirePermission('task', 'update')
  updateTask(@Param('id') id: string, @Body() data: UpdateTaskDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.updateTask(id, data, tenantId);
  }

  @Delete('tasks/:id')
  @RequirePermission('task', 'delete')
  async deleteTask(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.projectManagementService.deleteTask(id, tenantId);
    return { message: 'Task deleted successfully' };
  }

  // ─── Milestones ──────────────────────────────────────────────────────────────

  @Get('milestones')
  @RequirePermission('project', 'read')
  findAllMilestones(@CurrentTenant() tenantId: string, @Query('projectId') projectId?: string) {
    return this.projectManagementService.findAllMilestones(tenantId, projectId);
  }

  @Get('milestones/:id')
  @RequirePermission('project', 'read')
  findOneMilestone(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.findOneMilestone(id, tenantId);
  }

  @Post('milestones')
  @RequirePermission('project', 'create')
  createMilestone(@Body() data: CreateMilestoneDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.createMilestone(data, tenantId);
  }

  @Put('milestones/:id')
  @RequirePermission('project', 'update')
  updateMilestone(@Param('id') id: string, @Body() data: UpdateMilestoneDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.updateMilestone(id, data, tenantId);
  }

  @Delete('milestones/:id')
  @RequirePermission('project', 'delete')
  async deleteMilestone(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.projectManagementService.deleteMilestone(id, tenantId);
    return { message: 'Milestone deleted successfully' };
  }

  // ─── Resources ───────────────────────────────────────────────────────────────

  @Get('resources')
  @RequirePermission('project', 'read')
  findAllResources(@CurrentTenant() tenantId: string, @Query('projectId') projectId?: string) {
    return this.projectManagementService.findAllResources(tenantId, projectId);
  }

  @Get('resources/:id')
  @RequirePermission('project', 'read')
  findOneResource(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.findOneResource(id, tenantId);
  }

  @Post('resources')
  @RequirePermission('project', 'create')
  createResource(@Body() data: CreateResourceDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.createResource(data, tenantId);
  }

  @Put('resources/:id')
  @RequirePermission('project', 'update')
  updateResource(@Param('id') id: string, @Body() data: UpdateResourceDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.updateResource(id, data, tenantId);
  }

  @Delete('resources/:id')
  @RequirePermission('project', 'delete')
  async deleteResource(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.projectManagementService.deleteResource(id, tenantId);
    return { message: 'Resource deleted successfully' };
  }

  // ─── Timesheets ──────────────────────────────────────────────────────────────

  @Get('timesheets')
  @RequirePermission('timesheet', 'read')
  findAllTimesheets(@CurrentTenant() tenantId: string, @Query('employeeId') employeeId?: string) {
    return this.projectManagementService.findAllTimesheets(tenantId, employeeId);
  }

  @Get('timesheets/:id')
  @RequirePermission('timesheet', 'read')
  findOneTimesheet(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.findOneTimesheet(id, tenantId);
  }

  @Post('timesheets')
  @RequirePermission('timesheet', 'create')
  createTimesheet(@Body() data: CreateTimesheetDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.createTimesheet(data, tenantId);
  }

  @Put('timesheets/:id')
  @RequirePermission('timesheet', 'update')
  updateTimesheet(@Param('id') id: string, @Body() data: UpdateTimesheetDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.updateTimesheet(id, data, tenantId);
  }

  @Post('timesheets/:id/submit')
  @RequirePermission('timesheet', 'update')
  submitTimesheet(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.submitTimesheet(id, tenantId);
  }

  @Post('timesheets/:id/approve')
  @RequirePermission('timesheet', 'approve')
  approveTimesheet(@Param('id') id: string, @Body() data: ApproveTimesheetDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.approveTimesheet(id, data, tenantId);
  }

  @Post('timesheets/:id/reject')
  @RequirePermission('timesheet', 'approve')
  rejectTimesheet(@Param('id') id: string, @Body() data: RejectTimesheetDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.rejectTimesheet(id, data, tenantId);
  }
}
