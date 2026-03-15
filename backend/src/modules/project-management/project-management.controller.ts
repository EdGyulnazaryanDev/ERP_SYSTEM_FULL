import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ProjectManagementService } from './project-management.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/create-project.dto';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';
import { CreateTimesheetDto, UpdateTimesheetDto, ApproveTimesheetDto, RejectTimesheetDto } from './dto/create-timesheet.dto';

@Controller('project-management')
@UseGuards(JwtAuthGuard)
export class ProjectManagementController {
  constructor(private readonly projectManagementService: ProjectManagementService) { }

  // Projects
  @Get('projects')
  @RequirePermission('project', 'read')
  async findAllProjects(@CurrentTenant() tenantId: string) {
    return this.projectManagementService.findAllProjects(tenantId);
  }

  @Get('projects/:id')
  @RequirePermission('project', 'read')
  async findOneProject(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.findOneProject(id, tenantId);
  }

  @Post('projects')
  @RequirePermission('project', 'create')
  async createProject(@Body() data: CreateProjectDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.createProject(data, tenantId);
  }

  @Put('projects/:id')
  @RequirePermission('project', 'update')
  async updateProject(@Param('id') id: string, @Body() data: UpdateProjectDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.updateProject(id, data, tenantId);
  }

  @Delete('projects/:id')
  @RequirePermission('project', 'delete')
  async deleteProject(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.projectManagementService.deleteProject(id, tenantId);
    return { message: 'Project deleted successfully' };
  }

  @Get('projects/manager/:managerId')
  @RequirePermission('project', 'read')
  async getProjectsByManager(@Param('managerId') managerId: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.getProjectsByManager(managerId, tenantId);
  }

  @Get('projects/:projectId/gantt')
  @RequirePermission('project', 'read')
  async getGanttChartData(@Param('projectId') projectId: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.getGanttChartData(projectId, tenantId);
  }

  @Get('projects/:projectId/resources')
  @RequirePermission('project', 'read')
  async getProjectResources(@Param('projectId') projectId: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.getProjectResources(projectId, tenantId);
  }

  @Get('projects/:projectId/budget')
  @RequirePermission('project', 'read')
  async getProjectBudget(@Param('projectId') projectId: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.getProjectBudget(projectId, tenantId);
  }

  // Tasks
  @Get('projects/:projectId/tasks')
  @RequirePermission('task', 'read')
  async findAllTasks(@Param('projectId') projectId: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.findAllTasks(projectId, tenantId);
  }

  @Get('tasks/:id')
  @RequirePermission('task', 'read')
  async findOneTask(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.findOneTask(id, tenantId);
  }

  @Post('tasks')
  @RequirePermission('task', 'create')
  async createTask(@Body() data: CreateTaskDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.createTask(data, tenantId);
  }

  @Put('tasks/:id')
  @RequirePermission('task', 'update')
  async updateTask(@Param('id') id: string, @Body() data: UpdateTaskDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.updateTask(id, data, tenantId);
  }

  @Delete('tasks/:id')
  @RequirePermission('task', 'delete')
  async deleteTask(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.projectManagementService.deleteTask(id, tenantId);
    return { message: 'Task deleted successfully' };
  }

  @Get('tasks/assignee/:assigneeId')
  @RequirePermission('task', 'read')
  async getTasksByAssignee(@Param('assigneeId') assigneeId: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.getTasksByAssignee(assigneeId, tenantId);
  }

  // Timesheets
  @Get('timesheets')
  @RequirePermission('timesheet', 'read')
  async findAllTimesheets(@CurrentTenant() tenantId: string, @Query('employeeId') employeeId?: string) {
    return this.projectManagementService.findAllTimesheets(tenantId, employeeId);
  }

  @Get('timesheets/:id')
  @RequirePermission('timesheet', 'read')
  async findOneTimesheet(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.findOneTimesheet(id, tenantId);
  }

  @Post('timesheets')
  @RequirePermission('timesheet', 'create')
  async createTimesheet(@Body() data: CreateTimesheetDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.createTimesheet(data, tenantId);
  }

  @Put('timesheets/:id')
  @RequirePermission('timesheet', 'update')
  async updateTimesheet(@Param('id') id: string, @Body() data: UpdateTimesheetDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.updateTimesheet(id, data, tenantId);
  }

  @Post('timesheets/:id/submit')
  @RequirePermission('timesheet', 'update')
  async submitTimesheet(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.submitTimesheet(id, tenantId);
  }

  @Post('timesheets/:id/approve')
  @RequirePermission('timesheet', 'approve')
  async approveTimesheet(@Param('id') id: string, @Body() data: ApproveTimesheetDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.approveTimesheet(id, data, tenantId);
  }

  @Post('timesheets/:id/reject')
  @RequirePermission('timesheet', 'approve')
  async rejectTimesheet(@Param('id') id: string, @Body() data: RejectTimesheetDto, @CurrentTenant() tenantId: string) {
    return this.projectManagementService.rejectTimesheet(id, data, tenantId);
  }
}
