import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FinancialEventType, PayrollProcessedEvent } from '../accounting/events/financial.events';
import { EmployeeEntity } from './entities/employee.entity';
import { EmploymentContractService } from './employment-contract.service';
import { AttendanceEntity, AttendanceStatus } from './entities/attendance.entity';
import { LeaveTypeEntity } from './entities/leave-type.entity';
import { LeaveBalanceEntity } from './entities/leave-balance.entity';
import { LeaveRequestEntity, LeaveRequestStatus } from './entities/leave-request.entity';
import { SalaryComponentEntity } from './entities/salary-component.entity';
import { EmployeeSalaryEntity } from './entities/employee-salary.entity';
import { PayslipEntity, PayslipStatus } from './entities/payslip.entity';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import type { UpdateEmployeeDto } from './dto/update-employee.dto';
import type { CreateAttendanceDto, ClockInDto, ClockOutDto } from './dto/create-attendance.dto';
import type { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/create-leave-type.dto';
import type { CreateLeaveRequestDto, ApproveLeaveDto, RejectLeaveDto } from './dto/create-leave-request.dto';
import type { CreateSalaryComponentDto, UpdateSalaryComponentDto } from './dto/create-salary-component.dto';
import type { CreateEmployeeSalaryDto, UpdateEmployeeSalaryDto } from './dto/create-employee-salary.dto';

@Injectable()
export class HrService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private employeeRepo: Repository<EmployeeEntity>,
    @InjectRepository(AttendanceEntity)
    private attendanceRepo: Repository<AttendanceEntity>,
    @InjectRepository(LeaveTypeEntity)
    private leaveTypeRepo: Repository<LeaveTypeEntity>,
    @InjectRepository(LeaveBalanceEntity)
    private leaveBalanceRepo: Repository<LeaveBalanceEntity>,
    @InjectRepository(LeaveRequestEntity)
    private leaveRequestRepo: Repository<LeaveRequestEntity>,
    @InjectRepository(SalaryComponentEntity)
    private salaryComponentRepo: Repository<SalaryComponentEntity>,
    @InjectRepository(EmployeeSalaryEntity)
    private employeeSalaryRepo: Repository<EmployeeSalaryEntity>,
    @InjectRepository(PayslipEntity)
    private payslipRepo: Repository<PayslipEntity>,
    private eventEmitter: EventEmitter2,
    private contractService: EmploymentContractService,
  ) {}

  // ==================== EMPLOYEE METHODS ====================

  async findAllEmployees(tenantId: string): Promise<EmployeeEntity[]> {
    return this.employeeRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async findOneEmployee(id: string, tenantId: string): Promise<EmployeeEntity> {
    const employee = await this.employeeRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async createEmployee(data: CreateEmployeeDto, tenantId: string): Promise<EmployeeEntity> {
    const existing = await this.employeeRepo.findOne({
      where: [
        { email: data.email, tenant_id: tenantId },
        { employee_code: data.employee_code, tenant_id: tenantId },
      ],
    });

    if (existing) {
      throw new ConflictException('Employee with this email or code already exists');
    }

    const employee = this.employeeRepo.create({
      ...data,
      tenant_id: tenantId,
      contract_status: 'sent',
    });

    return this.employeeRepo.save(employee);
  }

  async updateEmployee(id: string, data: UpdateEmployeeDto, tenantId: string): Promise<EmployeeEntity> {
    const employee = await this.findOneEmployee(id, tenantId);

    if (data.email && data.email !== employee.email) {
      const existing = await this.employeeRepo.findOne({
        where: { email: data.email, tenant_id: tenantId },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Employee with this email already exists');
      }
    }

    Object.assign(employee, data);
    return this.employeeRepo.save(employee);
  }

  async deleteEmployee(id: string, tenantId: string): Promise<void> {
    const employee = await this.findOneEmployee(id, tenantId);
    await this.employeeRepo.remove(employee);
  }

  async getContractPdf(id: string, tenantId: string): Promise<Buffer> {
    const employee = await this.findOneEmployee(id, tenantId);
    return this.contractService.generateContractPdf(employee);
  }

  async signContract(id: string, tenantId: string, signature: string): Promise<EmployeeEntity> {
    return this.contractService.signContract(id, tenantId, signature);
  }

  async getEmployeesByDepartment(department: string, tenantId: string): Promise<EmployeeEntity[]> {
    return this.employeeRepo.find({
      where: { department, tenant_id: tenantId },
      order: { last_name: 'ASC' },
    });
  }

  async searchEmployees(query: string, tenantId: string): Promise<EmployeeEntity[]> {
    return this.employeeRepo
      .createQueryBuilder('employee')
      .where('employee.tenant_id = :tenantId', { tenantId })
      .andWhere(
        '(employee.first_name ILIKE :query OR employee.last_name ILIKE :query OR employee.email ILIKE :query OR employee.employee_code ILIKE :query)',
        { query: `%${query}%` },
      )
      .getMany();
  }

  // ==================== ATTENDANCE METHODS ====================

  async clockIn(data: ClockInDto, tenantId: string): Promise<AttendanceEntity> {
    await this.findOneEmployee(data.employee_id, tenantId);

    const today = new Date().toISOString().split('T')[0];
    const existing = await this.attendanceRepo.findOne({
      where: {
        employee_id: data.employee_id,
        date: new Date(today),
        tenant_id: tenantId,
      },
    });

    const now = new Date();
    const clockInTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    if (existing) {
      existing.clock_in_time = clockInTime;
      existing.clock_out_time = null as any;
      existing.work_hours = 0;
      existing.status = AttendanceStatus.PRESENT;
      return this.attendanceRepo.save(existing);
    }

    const attendance = this.attendanceRepo.create({
      employee_id: data.employee_id,
      date: new Date(today),
      clock_in_time: clockInTime,
      status: AttendanceStatus.PRESENT,
      tenant_id: tenantId,
    });

    return this.attendanceRepo.save(attendance);
  }

  async clockOut(data: ClockOutDto, tenantId: string): Promise<AttendanceEntity> {
    const today = new Date().toISOString().split('T')[0];
    const attendance = await this.attendanceRepo.findOne({
      where: {
        employee_id: data.employee_id,
        date: new Date(today),
        tenant_id: tenantId,
      },
    });

    if (!attendance) {
      throw new BadRequestException('No clock-in record found for today');
    }

    const now = new Date();
    const clockOutTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    attendance.clock_out_time = clockOutTime;
    attendance.work_hours = this.calculateWorkHours(attendance.clock_in_time, clockOutTime);

    return this.attendanceRepo.save(attendance);
  }

  private calculateWorkHours(clockIn: string, clockOut: string): number {
    const [inHours, inMinutes] = clockIn.split(':').map(Number);
    const [outHours, outMinutes] = clockOut.split(':').map(Number);

    const inTotalMinutes = inHours * 60 + inMinutes;
    const outTotalMinutes = outHours * 60 + outMinutes;

    return Number(((outTotalMinutes - inTotalMinutes) / 60).toFixed(2));
  }

  async markAttendance(data: CreateAttendanceDto, tenantId: string): Promise<AttendanceEntity> {
    await this.findOneEmployee(data.employee_id, tenantId);

    const existing = await this.attendanceRepo.findOne({
      where: {
        employee_id: data.employee_id,
        date: new Date(data.date),
        tenant_id: tenantId,
      },
    });

    if (existing) {
      Object.assign(existing, data);
      return this.attendanceRepo.save(existing);
    }

    const attendance = this.attendanceRepo.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.attendanceRepo.save(attendance);
  }

  async getTodayAttendance(tenantId: string): Promise<AttendanceEntity[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.attendanceRepo.find({
      where: {
        date: new Date(today),
        tenant_id: tenantId,
      },
      relations: ['employee'],
    });
  }

  async getEmployeeAttendance(
    employeeId: string,
    startDate: string,
    endDate: string,
    tenantId: string,
  ): Promise<AttendanceEntity[]> {
    return this.attendanceRepo.find({
      where: {
        employee_id: employeeId,
        date: Between(new Date(startDate), new Date(endDate)),
        tenant_id: tenantId,
      },
      order: { date: 'DESC' },
    });
  }

  // ==================== LEAVE TYPE METHODS ====================

  async createLeaveType(data: CreateLeaveTypeDto, tenantId: string): Promise<LeaveTypeEntity> {
    const leaveType = this.leaveTypeRepo.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.leaveTypeRepo.save(leaveType);
  }

  async getLeaveTypes(tenantId: string): Promise<LeaveTypeEntity[]> {
    return this.leaveTypeRepo.find({
      where: { tenant_id: tenantId, is_active: true },
      order: { name: 'ASC' },
    });
  }

  async updateLeaveType(id: string, data: UpdateLeaveTypeDto, tenantId: string): Promise<LeaveTypeEntity> {
    const leaveType = await this.leaveTypeRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    Object.assign(leaveType, data);
    return this.leaveTypeRepo.save(leaveType);
  }

  // ==================== LEAVE BALANCE METHODS ====================

  async initializeLeaveBalance(employeeId: string, year: number, tenantId: string): Promise<void> {
    await this.findOneEmployee(employeeId, tenantId);
    const leaveTypes = await this.getLeaveTypes(tenantId);

    for (const leaveType of leaveTypes) {
      const existing = await this.leaveBalanceRepo.findOne({
        where: {
          employee_id: employeeId,
          leave_type_id: leaveType.id,
          year,
          tenant_id: tenantId,
        },
      });

      if (!existing) {
        const balance = this.leaveBalanceRepo.create({
          employee_id: employeeId,
          leave_type_id: leaveType.id,
          year,
          total_days: leaveType.days_allowed,
          used_days: 0,
          remaining_days: leaveType.days_allowed,
          carried_forward: 0,
          tenant_id: tenantId,
        });

        await this.leaveBalanceRepo.save(balance);
      }
    }
  }

  async getLeaveBalance(employeeId: string, tenantId: string): Promise<LeaveBalanceEntity[]> {
    const currentYear = new Date().getFullYear();
    return this.leaveBalanceRepo.find({
      where: {
        employee_id: employeeId,
        year: currentYear,
        tenant_id: tenantId,
      },
      relations: ['leave_type'],
    });
  }

  // ==================== LEAVE REQUEST METHODS ====================

  async requestLeave(data: CreateLeaveRequestDto, employeeId: string, tenantId: string): Promise<LeaveRequestEntity> {
    await this.findOneEmployee(employeeId, tenantId);

    const currentYear = new Date().getFullYear();

    // Auto-initialize balance if not exists
    await this.initializeLeaveBalance(employeeId, currentYear, tenantId);

    const balance = await this.leaveBalanceRepo.findOne({
      where: {
        employee_id: employeeId,
        leave_type_id: data.leave_type_id,
        year: currentYear,
        tenant_id: tenantId,
      },
    });

    if (!balance || balance.remaining_days < data.days_count) {
      throw new BadRequestException('Insufficient leave balance');
    }

    const leaveRequest = this.leaveRequestRepo.create({
      ...data,
      employee_id: employeeId,
      tenant_id: tenantId,
    });

    return this.leaveRequestRepo.save(leaveRequest);
  }

  async approveLeave(requestId: string, data: ApproveLeaveDto, tenantId: string): Promise<LeaveRequestEntity> {
    const request = await this.leaveRequestRepo.findOne({
      where: { id: requestId, tenant_id: tenantId },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Leave request is not pending');
    }

    const currentYear = new Date().getFullYear();
    const balance = await this.leaveBalanceRepo.findOne({
      where: {
        employee_id: request.employee_id,
        leave_type_id: request.leave_type_id,
        year: currentYear,
        tenant_id: tenantId,
      },
    });

    if (balance) {
      balance.used_days = Number(balance.used_days) + Number(request.days_count);
      balance.remaining_days = Number(balance.remaining_days) - Number(request.days_count);
      await this.leaveBalanceRepo.save(balance);
    }

    request.status = LeaveRequestStatus.APPROVED;
    request.approver_id = data.approver_id;
    request.approval_date = new Date();

    return this.leaveRequestRepo.save(request);
  }

  async rejectLeave(requestId: string, data: RejectLeaveDto, tenantId: string): Promise<LeaveRequestEntity> {
    const request = await this.leaveRequestRepo.findOne({
      where: { id: requestId, tenant_id: tenantId },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Leave request is not pending');
    }

    request.status = LeaveRequestStatus.REJECTED;
    request.approver_id = data.approver_id;
    request.rejection_reason = data.rejection_reason;
    request.approval_date = new Date();

    return this.leaveRequestRepo.save(request);
  }

  async getLeaveRequests(tenantId: string, status?: LeaveRequestStatus): Promise<LeaveRequestEntity[]> {
    const where: any = { tenant_id: tenantId };
    if (status) {
      where.status = status;
    }

    return this.leaveRequestRepo.find({
      where,
      relations: ['employee', 'leave_type'],
      order: { created_at: 'DESC' },
    });
  }

  async getEmployeeLeaveRequests(employeeId: string, tenantId: string): Promise<LeaveRequestEntity[]> {
    return this.leaveRequestRepo.find({
      where: { employee_id: employeeId, tenant_id: tenantId },
      relations: ['leave_type'],
      order: { created_at: 'DESC' },
    });
  }

  // ==================== SALARY COMPONENT METHODS ====================

  async createSalaryComponent(data: CreateSalaryComponentDto, tenantId: string): Promise<SalaryComponentEntity> {
    const existing = await this.salaryComponentRepo.findOne({
      where: { code: data.code, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Salary component with this code already exists');
    }

    const component = this.salaryComponentRepo.create({
      ...data,
      tenant_id: tenantId,
    });

    return this.salaryComponentRepo.save(component);
  }

  async getSalaryComponents(tenantId: string): Promise<SalaryComponentEntity[]> {
    return this.salaryComponentRepo.find({
      where: { tenant_id: tenantId, is_active: true },
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async updateSalaryComponent(
    id: string,
    data: UpdateSalaryComponentDto,
    tenantId: string,
  ): Promise<SalaryComponentEntity> {
    const component = await this.salaryComponentRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!component) {
      throw new NotFoundException('Salary component not found');
    }

    Object.assign(component, data);
    return this.salaryComponentRepo.save(component);
  }

  // ==================== EMPLOYEE SALARY METHODS ====================

  async getAllSalaryStructures(tenantId: string): Promise<EmployeeSalaryEntity[]> {
    return this.employeeSalaryRepo.find({
      where: { is_active: true, tenant_id: tenantId },
      relations: ['employee'],
      order: { created_at: 'DESC' },
    });
  }

  async createSalaryStructure(data: CreateEmployeeSalaryDto, tenantId: string): Promise<EmployeeSalaryEntity> {
    await this.findOneEmployee(data.employee_id, tenantId);

    const existing = await this.employeeSalaryRepo.findOne({
      where: {
        employee_id: data.employee_id,
        is_active: true,
        tenant_id: tenantId,
      },
    });

    if (existing) {
      existing.is_active = false;
      existing.effective_to = new Date();
      await this.employeeSalaryRepo.save(existing);
    }

    let grossSalary = Number(data.basic_salary);
    let totalDeductions = 0;

    if (data.components) {
      data.components.forEach((comp) => {
        if (comp.type === 'earning') {
          grossSalary += Number(comp.amount);
        } else {
          totalDeductions += Number(comp.amount);
        }
      });
    }

    const salary = this.employeeSalaryRepo.create({
      ...data,
      gross_salary: grossSalary,
      total_deductions: totalDeductions,
      net_salary: grossSalary - totalDeductions,
      tenant_id: tenantId,
    });

    return this.employeeSalaryRepo.save(salary);
  }

  async getSalaryStructure(employeeId: string, tenantId: string): Promise<EmployeeSalaryEntity | null> {
    return this.employeeSalaryRepo.findOne({
      where: {
        employee_id: employeeId,
        is_active: true,
        tenant_id: tenantId,
      },
    });
  }

  // ==================== PAYROLL METHODS ====================

  async generatePayslips(month: number, year: number, tenantId: string): Promise<PayslipEntity[]> {
    const employees = await this.findAllEmployees(tenantId);

    for (const employee of employees) {
      const existing = await this.payslipRepo.findOne({
        where: {
          employee_id: employee.id,
          month: +month,
          year: +year,
          tenant_id: tenantId,
        },
      });

      if (!existing) {
        try {
          await this.generatePayslip(employee.id, +month, +year, tenantId);
        } catch (e) {
          // skip employees without salary structure
        }
      }
    }

    // Return all payslips for this period
    return this.payslipRepo.find({
      where: { month: +month, year: +year, tenant_id: tenantId },
      relations: ['employee'],
      order: { created_at: 'DESC' },
    });
  }

  private async generatePayslip(
    employeeId: string,
    month: number,
    year: number,
    tenantId: string,
  ): Promise<PayslipEntity> {
    const salary = await this.getSalaryStructure(employeeId, tenantId);

    if (!salary) {
      throw new BadRequestException(`No salary structure found for employee ${employeeId}`);
    }

    const m = +month;
    const y = +year;
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0);

    const attendances = await this.attendanceRepo.find({
      where: {
        employee_id: employeeId,
        date: Between(startDate, endDate),
        tenant_id: tenantId,
      },
    });

    const presentDays = attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length;
    const workingDays = this.getWorkingDaysInMonth(m, y);

    const payslipNumber = `PAY-${y}${m.toString().padStart(2, '0')}-${employeeId.substring(0, 8)}`;

    const payslip = this.payslipRepo.create({
      employee_id: employeeId,
      payslip_number: payslipNumber,
      month: m,
      year: y,
      pay_period_start: startDate,
      pay_period_end: endDate,
      working_days: workingDays,
      present_days: presentDays,
      earnings: salary.components?.filter((c) => c.type === 'earning') || [],
      deductions: salary.components?.filter((c) => c.type === 'deduction') || [],
      gross_salary: salary.gross_salary,
      total_deductions: salary.total_deductions,
      net_salary: salary.net_salary,
      status: PayslipStatus.DRAFT,
      tenant_id: tenantId,
    });

    return this.payslipRepo.save(payslip);
  }

  private getWorkingDaysInMonth(month: number, year: number): number {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    let workingDays = 0;

    for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }

    return workingDays;
  }

  async getPayslips(tenantId: string, month?: number, year?: number): Promise<PayslipEntity[]> {
    const where: any = { tenant_id: tenantId };
    if (month) where.month = month;
    if (year) where.year = year;

    return this.payslipRepo.find({
      where,
      relations: ['employee'],
      order: { created_at: 'DESC' },
    });
  }

  async getEmployeePayslips(employeeId: string, tenantId: string): Promise<PayslipEntity[]> {
    return this.payslipRepo.find({
      where: { employee_id: employeeId, tenant_id: tenantId },
      order: { year: 'DESC', month: 'DESC' },
    });
  }

  async updatePayslipStatus(id: string, status: PayslipStatus, tenantId: string): Promise<PayslipEntity> {
    const payslip = await this.payslipRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!payslip) {
      throw new NotFoundException('Payslip not found');
    }

    payslip.status = status;
    if (status === PayslipStatus.PAID) {
      payslip.payment_date = new Date();

      // Emit financial event so FinancialBrainService auto-creates the JE
      const event = new PayrollProcessedEvent();
      event.tenantId = payslip.tenant_id;
      event.payslipId = payslip.id;
      event.employeeId = payslip.employee_id;
      event.netAmount = Number(payslip.net_salary);
      event.date = new Date().toISOString().split('T')[0];
      this.eventEmitter.emit(FinancialEventType.PAYROLL_PROCESSED, event);
    }

    return this.payslipRepo.save(payslip);
  }
}
