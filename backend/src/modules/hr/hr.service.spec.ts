import { Test, TestingModule } from '@nestjs/testing';
import { HrService } from './hr.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { EmployeeEntity, EmploymentStatus, EmploymentType } from './entities/employee.entity';
import { AttendanceEntity, AttendanceStatus } from './entities/attendance.entity';
import { LeaveTypeEntity } from './entities/leave-type.entity';
import { LeaveBalanceEntity } from './entities/leave-balance.entity';
import { LeaveRequestEntity, LeaveRequestStatus } from './entities/leave-request.entity';
import { SalaryComponentEntity, ComponentType, CalculationType } from './entities/salary-component.entity';
import { EmployeeSalaryEntity } from './entities/employee-salary.entity';
import { PayslipEntity, PayslipStatus } from './entities/payslip.entity';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

describe('HrService', () => {
  let service: HrService;
  let employeeRepo: jest.Mocked<Repository<EmployeeEntity>>;
  let attendanceRepo: jest.Mocked<Repository<AttendanceEntity>>;
  let leaveTypeRepo: jest.Mocked<Repository<LeaveTypeEntity>>;
  let leaveBalanceRepo: jest.Mocked<Repository<LeaveBalanceEntity>>;
  let leaveRequestRepo: jest.Mocked<Repository<LeaveRequestEntity>>;
  let salaryComponentRepo: jest.Mocked<Repository<SalaryComponentEntity>>;
  let employeeSalaryRepo: jest.Mocked<Repository<EmployeeSalaryEntity>>;
  let payslipRepo: jest.Mocked<Repository<PayslipEntity>>;

  const mockEmployee: EmployeeEntity = {
    id: 'emp-1',
    tenant_id: 'tenant-1',
    employee_code: 'EMP001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '1234567890',
    date_of_birth: new Date('1990-01-01'),
    gender: 'male',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    postal_code: '10001',
    country: 'USA',
    department: 'Engineering',
    position: 'Software Engineer',
    manager_id: null,
    hire_date: new Date('2020-01-01'),
    termination_date: null,
    employment_type: EmploymentType.FULL_TIME,
    status: EmploymentStatus.ACTIVE,
    salary: 75000,
    bank_account: '1234567890',
    bank_name: 'Test Bank',
    tax_id: 'TAX123',
    social_security: 'SSN123',
    emergency_contact: 'Jane Doe - 9876543210',
    notes: null,
    attendances: [],
    leave_requests: [],
    leave_balances: [],
    salary_structures: [],
    payslips: [],
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HrService,
        {
          provide: getRepositoryToken(EmployeeEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AttendanceEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LeaveTypeEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LeaveBalanceEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LeaveRequestEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SalaryComponentEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EmployeeSalaryEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PayslipEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HrService>(HrService);
    employeeRepo = module.get(getRepositoryToken(EmployeeEntity));
    attendanceRepo = module.get(getRepositoryToken(AttendanceEntity));
    leaveTypeRepo = module.get(getRepositoryToken(LeaveTypeEntity));
    leaveBalanceRepo = module.get(getRepositoryToken(LeaveBalanceEntity));
    leaveRequestRepo = module.get(getRepositoryToken(LeaveRequestEntity));
    salaryComponentRepo = module.get(getRepositoryToken(SalaryComponentEntity));
    employeeSalaryRepo = module.get(getRepositoryToken(EmployeeSalaryEntity));
    payslipRepo = module.get(getRepositoryToken(PayslipEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== EMPLOYEE TESTS ====================

  describe('findAllEmployees', () => {
    it('should return all employees for tenant', async () => {
      const employees = [mockEmployee];
      employeeRepo.find.mockResolvedValue(employees);

      const result = await service.findAllEmployees('tenant-1');

      expect(result).toEqual(employees);
      expect(employeeRepo.find).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-1' },
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findOneEmployee', () => {
    it('should return employee by id', async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);

      const result = await service.findOneEmployee('emp-1', 'tenant-1');

      expect(result).toEqual(mockEmployee);
    });

    it('should throw NotFoundException if employee not found', async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneEmployee('emp-999', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createEmployee', () => {
    it('should create employee successfully', async () => {
      const createDto = {
        employee_code: 'EMP002',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        department: 'HR',
        position: 'HR Manager',
        hire_date: '2021-01-01',
      };

      employeeRepo.findOne.mockResolvedValue(null);
      employeeRepo.create.mockReturnValue({ ...mockEmployee, ...createDto } as any);
      employeeRepo.save.mockResolvedValue({ ...mockEmployee, ...createDto } as any);

      const result = await service.createEmployee(createDto as any, 'tenant-1');

      expect(result).toHaveProperty('id');
      expect(employeeRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if employee email exists', async () => {
      const createDto = {
        employee_code: 'EMP002',
        email: 'john.doe@example.com',
      };

      employeeRepo.findOne.mockResolvedValue(mockEmployee);

      await expect(
        service.createEmployee(createDto as any, 'tenant-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateEmployee', () => {
    it('should update employee successfully', async () => {
      const updateDto = { position: 'Senior Software Engineer' };
      const updated = { ...mockEmployee, ...updateDto };

      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      employeeRepo.save.mockResolvedValue(updated);

      const result = await service.updateEmployee('emp-1', updateDto as any, 'tenant-1');

      expect(result.position).toBe('Senior Software Engineer');
    });
  });

  describe('deleteEmployee', () => {
    it('should delete employee successfully', async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      employeeRepo.remove.mockResolvedValue(mockEmployee);

      await service.deleteEmployee('emp-1', 'tenant-1');

      expect(employeeRepo.remove).toHaveBeenCalled();
    });
  });

  describe('getEmployeesByDepartment', () => {
    it('should return employees by department', async () => {
      const employees = [mockEmployee];
      employeeRepo.find.mockResolvedValue(employees);

      const result = await service.getEmployeesByDepartment('Engineering', 'tenant-1');

      expect(result).toEqual(employees);
      expect(employeeRepo.find).toHaveBeenCalledWith({
        where: { department: 'Engineering', tenant_id: 'tenant-1' },
        order: { last_name: 'ASC' },
      });
    });
  });

  // ==================== ATTENDANCE TESTS ====================

  describe('clockIn', () => {
    it('should clock in employee successfully', async () => {
      const mockAttendance = {
        id: 'att-1',
        tenant_id: 'tenant-1',
        employee_id: 'emp-1',
        date: new Date(),
        clock_in_time: '09:00:00',
        clock_out_time: null,
        work_hours: 0,
        overtime_hours: 0,
        status: AttendanceStatus.PRESENT,
        notes: null,
        employee: mockEmployee,
        created_at: new Date(),
        updated_at: new Date(),
      };

      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      attendanceRepo.findOne.mockResolvedValue(null);
      attendanceRepo.create.mockReturnValue(mockAttendance);
      attendanceRepo.save.mockResolvedValue(mockAttendance);

      const result = await service.clockIn({ employee_id: 'emp-1' }, 'tenant-1');

      expect(result).toHaveProperty('clock_in_time');
      expect(attendanceRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if already clocked in', async () => {
      const existingAttendance = {
        clock_in_time: '09:00:00',
      };

      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      attendanceRepo.findOne.mockResolvedValue(existingAttendance as any);

      await expect(
        service.clockIn({ employee_id: 'emp-1' }, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('clockOut', () => {
    it('should clock out employee successfully', async () => {
      const mockAttendance = {
        id: 'att-1',
        employee_id: 'emp-1',
        clock_in_time: '09:00:00',
        clock_out_time: null,
      };

      attendanceRepo.findOne.mockResolvedValue(mockAttendance as any);
      attendanceRepo.save.mockResolvedValue({ ...mockAttendance, clock_out_time: '17:00:00' } as any);

      const result = await service.clockOut({ employee_id: 'emp-1' }, 'tenant-1');

      expect(result).toHaveProperty('clock_out_time');
      expect(attendanceRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no clock-in record', async () => {
      attendanceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.clockOut({ employee_id: 'emp-1' }, 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== LEAVE TYPE TESTS ====================

  describe('createLeaveType', () => {
    it('should create leave type successfully', async () => {
      const createDto = {
        name: 'Annual Leave',
        days_allowed: 20,
        carry_forward: true,
        max_carry_forward_days: 5,
        requires_approval: true,
      };

      const mockLeaveType = {
        id: 'lt-1',
        tenant_id: 'tenant-1',
        ...createDto,
        description: null,
        is_active: true,
        leave_balances: [],
        leave_requests: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      leaveTypeRepo.create.mockReturnValue(mockLeaveType);
      leaveTypeRepo.save.mockResolvedValue(mockLeaveType);

      const result = await service.createLeaveType(createDto as any, 'tenant-1');

      expect(result).toHaveProperty('id');
      expect(leaveTypeRepo.save).toHaveBeenCalled();
    });
  });

  describe('getLeaveTypes', () => {
    it('should return all active leave types', async () => {
      const leaveTypes = [
        {
          id: 'lt-1',
          name: 'Annual Leave',
          is_active: true,
        },
      ];

      leaveTypeRepo.find.mockResolvedValue(leaveTypes as any);

      const result = await service.getLeaveTypes('tenant-1');

      expect(result).toEqual(leaveTypes);
      expect(leaveTypeRepo.find).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-1', is_active: true },
        order: { name: 'ASC' },
      });
    });
  });

  // ==================== LEAVE REQUEST TESTS ====================

  describe('requestLeave', () => {
    it('should create leave request successfully', async () => {
      const createDto = {
        leave_type_id: 'lt-1',
        start_date: '2024-03-01',
        end_date: '2024-03-05',
        days_count: 5,
        reason: 'Vacation',
      };

      const mockLeaveBalance = {
        id: 'lb-1',
        employee_id: 'emp-1',
        leave_type_id: 'lt-1',
        remaining_days: 10,
      };

      const mockLeaveRequest = {
        id: 'lr-1',
        tenant_id: 'tenant-1',
        employee_id: 'emp-1',
        ...createDto,
        status: LeaveRequestStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      };

      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      leaveBalanceRepo.findOne.mockResolvedValue(mockLeaveBalance as any);
      leaveRequestRepo.create.mockReturnValue(mockLeaveRequest as any);
      leaveRequestRepo.save.mockResolvedValue(mockLeaveRequest as any);

      const result = await service.requestLeave(createDto as any, 'emp-1', 'tenant-1');

      expect(result).toHaveProperty('id');
      expect(leaveRequestRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if insufficient leave balance', async () => {
      const createDto = {
        leave_type_id: 'lt-1',
        days_count: 15,
      };

      const mockLeaveBalance = {
        remaining_days: 5,
      };

      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      leaveBalanceRepo.findOne.mockResolvedValue(mockLeaveBalance as any);

      await expect(
        service.requestLeave(createDto as any, 'emp-1', 'tenant-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== SALARY COMPONENT TESTS ====================

  describe('createSalaryComponent', () => {
    it('should create salary component successfully', async () => {
      const createDto = {
        name: 'Basic Salary',
        code: 'BASIC',
        type: ComponentType.EARNING,
        calculation_type: CalculationType.FIXED,
        value: 50000,
        is_taxable: true,
      };

      const mockComponent = {
        id: 'sc-1',
        tenant_id: 'tenant-1',
        ...createDto,
        description: null,
        is_active: true,
        sort_order: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      salaryComponentRepo.findOne.mockResolvedValue(null);
      salaryComponentRepo.create.mockReturnValue(mockComponent);
      salaryComponentRepo.save.mockResolvedValue(mockComponent);

      const result = await service.createSalaryComponent(createDto as any, 'tenant-1');

      expect(result).toHaveProperty('id');
      expect(salaryComponentRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if component code exists', async () => {
      const createDto = {
        code: 'BASIC',
      };

      salaryComponentRepo.findOne.mockResolvedValue({ id: 'sc-1' } as any);

      await expect(
        service.createSalaryComponent(createDto as any, 'tenant-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ==================== PAYROLL TESTS ====================

  describe('generatePayslips', () => {
    it('should generate payslips for all employees', async () => {
      const mockSalary = {
        id: 'es-1',
        employee_id: 'emp-1',
        basic_salary: 50000,
        gross_salary: 60000,
        total_deductions: 5000,
        net_salary: 55000,
        components: [],
      };

      employeeRepo.find.mockResolvedValue([mockEmployee]);
      payslipRepo.findOne.mockResolvedValue(null);
      employeeSalaryRepo.findOne.mockResolvedValue(mockSalary as any);
      attendanceRepo.find.mockResolvedValue([]);
      payslipRepo.create.mockReturnValue({} as any);
      payslipRepo.save.mockResolvedValue({} as any);

      const result = await service.generatePayslips(3, 2024, 'tenant-1');

      expect(result).toBeInstanceOf(Array);
      expect(payslipRepo.save).toHaveBeenCalled();
    });
  });

  describe('updatePayslipStatus', () => {
    it('should update payslip status successfully', async () => {
      const mockPayslip = {
        id: 'ps-1',
        tenant_id: 'tenant-1',
        status: PayslipStatus.DRAFT,
      };

      payslipRepo.findOne.mockResolvedValue(mockPayslip as any);
      payslipRepo.save.mockResolvedValue({ ...mockPayslip, status: PayslipStatus.PAID } as any);

      const result = await service.updatePayslipStatus('ps-1', PayslipStatus.PAID, 'tenant-1');

      expect(result.status).toBe(PayslipStatus.PAID);
      expect(payslipRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if payslip not found', async () => {
      payslipRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updatePayslipStatus('ps-999', PayslipStatus.PAID, 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
