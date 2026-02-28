import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProjectManagementService } from './project-management.service';
import { ProjectEntity, ProjectStatus, ProjectPriority } from './entities/project.entity';
import { TaskEntity, TaskStatus, TaskPriority } from './entities/task.entity';
import { MilestoneEntity } from './entities/milestone.entity';
import { TimesheetEntity, TimesheetStatus } from './entities/timesheet.entity';
import { TimesheetEntryEntity } from './entities/timesheet-entry.entity';
import { ProjectResourceEntity } from './entities/project-resource.entity';
import { ProjectBudgetEntity } from './entities/project-budget.entity';

describe('ProjectManagementService', () => {
  let service: ProjectManagementService;
  let projectRepository: Repository<ProjectEntity>;
  let taskRepository: Repository<TaskEntity>;
  let timesheetRepository: Repository<TimesheetEntity>;
  let timesheetEntryRepository: Repository<TimesheetEntryEntity>;

  const mockProjectRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockTaskRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockTimesheetRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
  };

  const mockTimesheetEntryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockMilestoneRepository = {};
  const mockProjectResourceRepository = { find: jest.fn() };
  const mockProjectBudgetRepository = { find: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectManagementService,
        { provide: getRepositoryToken(ProjectEntity), useValue: mockProjectRepository },
        { provide: getRepositoryToken(TaskEntity), useValue: mockTaskRepository },
        { provide: getRepositoryToken(MilestoneEntity), useValue: mockMilestoneRepository },
        { provide: getRepositoryToken(TimesheetEntity), useValue: mockTimesheetRepository },
        { provide: getRepositoryToken(TimesheetEntryEntity), useValue: mockTimesheetEntryRepository },
        { provide: getRepositoryToken(ProjectResourceEntity), useValue: mockProjectResourceRepository },
        { provide: getRepositoryToken(ProjectBudgetEntity), useValue: mockProjectBudgetRepository },
      ],
    }).compile();

    service = module.get<ProjectManagementService>(ProjectManagementService);
    projectRepository = module.get<Repository<ProjectEntity>>(getRepositoryToken(ProjectEntity));
    taskRepository = module.get<Repository<TaskEntity>>(getRepositoryToken(TaskEntity));
    timesheetRepository = module.get<Repository<TimesheetEntity>>(getRepositoryToken(TimesheetEntity));
    timesheetEntryRepository = module.get<Repository<TimesheetEntryEntity>>(getRepositoryToken(TimesheetEntryEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllProjects', () => {
    it('should return all projects for a tenant', async () => {
      const tenantId = 'tenant-1';
      const projects = [
        { id: '1', project_name: 'Project 1', tenant_id: tenantId },
        { id: '2', project_name: 'Project 2', tenant_id: tenantId },
      ];

      mockProjectRepository.find.mockResolvedValue(projects);

      const result = await service.findAllProjects(tenantId);

      expect(result).toEqual(projects);
      expect(mockProjectRepository.find).toHaveBeenCalledWith({
        where: { tenant_id: tenantId },
        relations: ['tasks', 'milestones', 'resources'],
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findOneProject', () => {
    it('should return a project by id', async () => {
      const tenantId = 'tenant-1';
      const projectId = 'project-1';
      const project = { id: projectId, project_name: 'Project 1', tenant_id: tenantId };

      mockProjectRepository.findOne.mockResolvedValue(project);

      const result = await service.findOneProject(projectId, tenantId);

      expect(result).toEqual(project);
      expect(mockProjectRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId, tenant_id: tenantId },
        relations: ['tasks', 'milestones', 'resources'],
      });
    });

    it('should throw NotFoundException if project not found', async () => {
      const tenantId = 'tenant-1';
      const projectId = 'non-existent';

      mockProjectRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneProject(projectId, tenantId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const tenantId = 'tenant-1';
      const createDto = {
        project_code: 'PRJ-001',
        project_name: 'New Project',
        project_manager_id: 'manager-1',
        start_date: '2024-01-01',
      };

      const createdProject = { id: '1', ...createDto, tenant_id: tenantId };

      mockProjectRepository.create.mockReturnValue(createdProject);
      mockProjectRepository.save.mockResolvedValue(createdProject);

      const result = await service.createProject(createDto, tenantId);

      expect(result).toEqual(createdProject);
      expect(mockProjectRepository.create).toHaveBeenCalledWith({
        ...createDto,
        tenant_id: tenantId,
      });
      expect(mockProjectRepository.save).toHaveBeenCalledWith(createdProject);
    });
  });

  describe('updateProject', () => {
    it('should update a project', async () => {
      const tenantId = 'tenant-1';
      const projectId = 'project-1';
      const updateDto = { project_name: 'Updated Project' };
      const existingProject = { id: projectId, project_name: 'Old Project', tenant_id: tenantId };
      const updatedProject = { ...existingProject, ...updateDto };

      mockProjectRepository.findOne.mockResolvedValue(existingProject);
      mockProjectRepository.save.mockResolvedValue(updatedProject);

      const result = await service.updateProject(projectId, updateDto, tenantId);

      expect(result).toEqual(updatedProject);
      expect(mockProjectRepository.save).toHaveBeenCalled();
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      const tenantId = 'tenant-1';
      const projectId = 'project-1';
      const project = { id: projectId, project_name: 'Project 1', tenant_id: tenantId };

      mockProjectRepository.findOne.mockResolvedValue(project);
      mockProjectRepository.remove.mockResolvedValue(project);

      await service.deleteProject(projectId, tenantId);

      expect(mockProjectRepository.remove).toHaveBeenCalledWith(project);
    });
  });

  describe('findAllTasks', () => {
    it('should return all tasks for a project', async () => {
      const tenantId = 'tenant-1';
      const projectId = 'project-1';
      const tasks = [
        { id: '1', task_name: 'Task 1', project_id: projectId, tenant_id: tenantId },
        { id: '2', task_name: 'Task 2', project_id: projectId, tenant_id: tenantId },
      ];

      mockTaskRepository.find.mockResolvedValue(tasks);

      const result = await service.findAllTasks(projectId, tenantId);

      expect(result).toEqual(tasks);
      expect(mockTaskRepository.find).toHaveBeenCalledWith({
        where: { project_id: projectId, tenant_id: tenantId },
        relations: ['dependencies'],
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const tenantId = 'tenant-1';
      const createDto = {
        project_id: 'project-1',
        task_code: 'TSK-001',
        task_name: 'New Task',
      };

      const createdTask = { id: '1', ...createDto, tenant_id: tenantId };

      mockTaskRepository.create.mockReturnValue(createdTask);
      mockTaskRepository.save.mockResolvedValue(createdTask);

      const result = await service.createTask(createDto, tenantId);

      expect(result).toEqual(createdTask);
      expect(mockTaskRepository.create).toHaveBeenCalledWith({
        ...createDto,
        tenant_id: tenantId,
      });
    });
  });

  describe('createTimesheet', () => {
    it('should create a timesheet with entries', async () => {
      const tenantId = 'tenant-1';
      const createDto = {
        employee_id: 'emp-1',
        week_start_date: '2024-01-01',
        week_end_date: '2024-01-07',
        entries: [
          { project_id: 'proj-1', work_date: '2024-01-01', hours: 8 },
          { project_id: 'proj-1', work_date: '2024-01-02', hours: 7.5 },
        ],
      };

      const savedTimesheet = { id: 'ts-1', ...createDto, tenant_id: tenantId, total_hours: 0 };
      const entries = createDto.entries.map((e, i) => ({ id: `entry-${i}`, ...e, timesheet_id: 'ts-1', tenant_id: tenantId }));

      mockTimesheetRepository.create.mockReturnValue(savedTimesheet);
      mockTimesheetRepository.save.mockResolvedValue(savedTimesheet);
      mockTimesheetEntryRepository.create.mockImplementation((data) => data);
      mockTimesheetEntryRepository.save.mockResolvedValue(entries);
      mockTimesheetRepository.findOne.mockResolvedValue({ ...savedTimesheet, entries, total_hours: 15.5 });

      const result = await service.createTimesheet(createDto, tenantId);

      expect(result.total_hours).toBe(15.5);
      expect(mockTimesheetEntryRepository.save).toHaveBeenCalled();
    });
  });

  describe('submitTimesheet', () => {
    it('should submit a draft timesheet', async () => {
      const tenantId = 'tenant-1';
      const timesheetId = 'ts-1';
      const timesheet = { id: timesheetId, status: TimesheetStatus.DRAFT, tenant_id: tenantId };

      mockTimesheetRepository.findOne.mockResolvedValue(timesheet);
      mockTimesheetRepository.save.mockResolvedValue({ ...timesheet, status: TimesheetStatus.SUBMITTED });

      const result = await service.submitTimesheet(timesheetId, tenantId);

      expect(result.status).toBe(TimesheetStatus.SUBMITTED);
    });

    it('should throw error if timesheet is not draft', async () => {
      const tenantId = 'tenant-1';
      const timesheetId = 'ts-1';
      const timesheet = { id: timesheetId, status: TimesheetStatus.APPROVED, tenant_id: tenantId };

      mockTimesheetRepository.findOne.mockResolvedValue(timesheet);

      await expect(service.submitTimesheet(timesheetId, tenantId)).rejects.toThrow('Only draft timesheets can be submitted');
    });
  });

  describe('approveTimesheet', () => {
    it('should approve a submitted timesheet', async () => {
      const tenantId = 'tenant-1';
      const timesheetId = 'ts-1';
      const approveDto = { approved_by: 'manager-1' };
      const timesheet = { id: timesheetId, status: TimesheetStatus.SUBMITTED, tenant_id: tenantId };

      mockTimesheetRepository.findOne.mockResolvedValue(timesheet);
      mockTimesheetRepository.save.mockResolvedValue({
        ...timesheet,
        status: TimesheetStatus.APPROVED,
        approved_by: approveDto.approved_by,
      });

      const result = await service.approveTimesheet(timesheetId, approveDto, tenantId);

      expect(result.status).toBe(TimesheetStatus.APPROVED);
      expect(result.approved_by).toBe(approveDto.approved_by);
    });
  });
});
