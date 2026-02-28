import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from './entities/project.entity';
import { TaskEntity } from './entities/task.entity';
import { MilestoneEntity } from './entities/milestone.entity';
import { TimesheetEntity, TimesheetStatus } from './entities/timesheet.entity';
import { TimesheetEntryEntity } from './entities/timesheet-entry.entity';
import { ProjectResourceEntity } from './entities/project-resource.entity';
import { ProjectBudgetEntity } from './entities/project-budget.entity';
import type { CreateProjectDto, UpdateProjectDto } from './dto/create-project.dto';
import type { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';
import type { CreateTimesheetDto, UpdateTimesheetDto, ApproveTimesheetDto, RejectTimesheetDto } from './dto/create-timesheet.dto';

@Injectable()
export class ProjectManagementService {
  constructor(
    @InjectRepository(ProjectEntity)
    private projectRepository: Repository<ProjectEntity>,
    @InjectRepository(TaskEntity)
    private taskRepository: Repository<TaskEntity>,
    @InjectRepository(MilestoneEntity)
    private milestoneRepository: Repository<MilestoneEntity>,
    @InjectRepository(TimesheetEntity)
    private timesheetRepository: Repository<TimesheetEntity>,
    @InjectRepository(TimesheetEntryEntity)
    private timesheetEntryRepository: Repository<TimesheetEntryEntity>,
    @InjectRepository(ProjectResourceEntity)
    private projectResourceRepository: Repository<ProjectResourceEntity>,
    @InjectRepository(ProjectBudgetEntity)
    private projectBudgetRepository: Repository<ProjectBudgetEntity>,
  ) {}

  // Project Management
  async findAllProjects(tenantId: string): Promise<ProjectEntity[]> {
    return this.projectRepository.find({
      where: { tenant_id: tenantId },
      relations: ['tasks', 'milestones', 'resources'],
      order: { created_at: 'DESC' },
    });
  }

  async findOneProject(id: string, tenantId: string): Promise<ProjectEntity> {
    const project = await this.projectRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['tasks', 'milestones', 'resources'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async createProject(data: CreateProjectDto, tenantId: string): Promise<ProjectEntity> {
    const project = this.projectRepository.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.projectRepository.save(project);
  }

  async updateProject(id: string, data: UpdateProjectDto, tenantId: string): Promise<ProjectEntity> {
    const project = await this.findOneProject(id, tenantId);

    Object.assign(project, data);

    return this.projectRepository.save(project);
  }

  async deleteProject(id: string, tenantId: string): Promise<void> {
    const project = await this.findOneProject(id, tenantId);
    await this.projectRepository.remove(project);
  }

  async getProjectsByManager(managerId: string, tenantId: string): Promise<ProjectEntity[]> {
    return this.projectRepository.find({
      where: { project_manager_id: managerId, tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  // Task Management
  async findAllTasks(projectId: string, tenantId: string): Promise<TaskEntity[]> {
    return this.taskRepository.find({
      where: { project_id: projectId, tenant_id: tenantId },
      relations: ['dependencies'],
      order: { created_at: 'DESC' },
    });
  }

  async findOneTask(id: string, tenantId: string): Promise<TaskEntity> {
    const task = await this.taskRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['project', 'dependencies', 'parent_task'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async createTask(data: CreateTaskDto, tenantId: string): Promise<TaskEntity> {
    const task = this.taskRepository.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.taskRepository.save(task);
  }

  async updateTask(id: string, data: UpdateTaskDto, tenantId: string): Promise<TaskEntity> {
    const task = await this.findOneTask(id, tenantId);

    Object.assign(task, data);

    return this.taskRepository.save(task);
  }

  async deleteTask(id: string, tenantId: string): Promise<void> {
    const task = await this.findOneTask(id, tenantId);
    await this.taskRepository.remove(task);
  }

  async getTasksByAssignee(assigneeId: string, tenantId: string): Promise<TaskEntity[]> {
    return this.taskRepository.find({
      where: { assigned_to: assigneeId, tenant_id: tenantId },
      relations: ['project'],
      order: { due_date: 'ASC' },
    });
  }

  // Timesheet Management
  async findAllTimesheets(tenantId: string, employeeId?: string): Promise<TimesheetEntity[]> {
    const where: any = { tenant_id: tenantId };
    if (employeeId) {
      where.employee_id = employeeId;
    }

    return this.timesheetRepository.find({
      where,
      relations: ['entries'],
      order: { week_start_date: 'DESC' },
    });
  }

  async findOneTimesheet(id: string, tenantId: string): Promise<TimesheetEntity> {
    const timesheet = await this.timesheetRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['entries'],
    });

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }

    return timesheet;
  }

  async createTimesheet(data: CreateTimesheetDto, tenantId: string): Promise<TimesheetEntity> {
    const timesheet = this.timesheetRepository.create({
      employee_id: data.employee_id,
      week_start_date: data.week_start_date,
      week_end_date: data.week_end_date,
      notes: data.notes,
      tenant_id: tenantId,
    });

    const savedTimesheet = await this.timesheetRepository.save(timesheet);

    // Create entries
    const entries = data.entries.map((entry) =>
      this.timesheetEntryRepository.create({
        ...entry,
        timesheet_id: savedTimesheet.id,
        tenant_id: tenantId,
      }),
    );

    await this.timesheetEntryRepository.save(entries);

    // Calculate total hours
    const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    savedTimesheet.total_hours = totalHours;
    await this.timesheetRepository.save(savedTimesheet);

    return this.findOneTimesheet(savedTimesheet.id, tenantId);
  }

  async updateTimesheet(id: string, data: UpdateTimesheetDto, tenantId: string): Promise<TimesheetEntity> {
    const timesheet = await this.findOneTimesheet(id, tenantId);

    if (timesheet.status !== TimesheetStatus.DRAFT) {
      throw new Error('Only draft timesheets can be updated');
    }

    if (data.notes) {
      timesheet.notes = data.notes;
    }

    if (data.entries) {
      // Delete existing entries
      await this.timesheetEntryRepository.delete({ timesheet_id: id, tenant_id: tenantId });

      // Create new entries
      const entries = data.entries.map((entry) =>
        this.timesheetEntryRepository.create({
          ...entry,
          timesheet_id: id,
          tenant_id: tenantId,
        }),
      );

      await this.timesheetEntryRepository.save(entries);

      // Recalculate total hours
      const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
      timesheet.total_hours = totalHours;
    }

    return this.timesheetRepository.save(timesheet);
  }

  async submitTimesheet(id: string, tenantId: string): Promise<TimesheetEntity> {
    const timesheet = await this.findOneTimesheet(id, tenantId);

    if (timesheet.status !== TimesheetStatus.DRAFT) {
      throw new Error('Only draft timesheets can be submitted');
    }

    timesheet.status = TimesheetStatus.SUBMITTED;
    return this.timesheetRepository.save(timesheet);
  }

  async approveTimesheet(id: string, data: ApproveTimesheetDto, tenantId: string): Promise<TimesheetEntity> {
    const timesheet = await this.findOneTimesheet(id, tenantId);

    if (timesheet.status !== TimesheetStatus.SUBMITTED) {
      throw new Error('Only submitted timesheets can be approved');
    }

    timesheet.status = TimesheetStatus.APPROVED;
    timesheet.approved_by = data.approved_by;
    timesheet.approved_at = new Date();

    return this.timesheetRepository.save(timesheet);
  }

  async rejectTimesheet(id: string, data: RejectTimesheetDto, tenantId: string): Promise<TimesheetEntity> {
    const timesheet = await this.findOneTimesheet(id, tenantId);

    if (timesheet.status !== TimesheetStatus.SUBMITTED) {
      throw new Error('Only submitted timesheets can be rejected');
    }

    timesheet.status = TimesheetStatus.REJECTED;
    timesheet.rejection_reason = data.rejection_reason;

    return this.timesheetRepository.save(timesheet);
  }

  // Project Resources
  async getProjectResources(projectId: string, tenantId: string): Promise<ProjectResourceEntity[]> {
    return this.projectResourceRepository.find({
      where: { project_id: projectId, tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  // Project Budget
  async getProjectBudget(projectId: string, tenantId: string): Promise<ProjectBudgetEntity[]> {
    return this.projectBudgetRepository.find({
      where: { project_id: projectId, tenant_id: tenantId },
      order: { category: 'ASC' },
    });
  }

  // Gantt Chart Data
  async getGanttChartData(projectId: string, tenantId: string): Promise<any> {
    const tasks = await this.taskRepository.find({
      where: { project_id: projectId, tenant_id: tenantId },
      relations: ['dependencies'],
      order: { start_date: 'ASC' },
    });

    return tasks.map((task) => ({
      id: task.id,
      name: task.task_name,
      start: task.start_date,
      end: task.due_date,
      progress: task.progress_percentage,
      dependencies: task.dependencies.map((dep) => dep.depends_on_task_id),
      assignee: task.assigned_to,
    }));
  }
}
