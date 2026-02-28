import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HrService } from './hr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateAttendanceDto, ClockInDto, ClockOutDto } from './dto/create-attendance.dto';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/create-leave-type.dto';
import { CreateLeaveRequestDto, ApproveLeaveDto, RejectLeaveDto } from './dto/create-leave-request.dto';
import { CreateSalaryComponentDto, UpdateSalaryComponentDto } from './dto/create-salary-component.dto';
import { CreateEmployeeSalaryDto } from './dto/create-employee-salary.dto';
import { LeaveRequestStatus } from './entities/leave-request.entity';
import { PayslipStatus } from './entities/payslip.entity';

@UseGuards(JwtAuthGuard)
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // ==================== EMPLOYEE ENDPOINTS ====================

  @Get('employees')
  findAllEmployees(@CurrentTenant() tenantId: string) {
    return this.hrService.findAllEmployees(tenantId);
  }

  @Get('employees/search')
  searchEmployees(@Query('q') query: string, @CurrentTenant() tenantId: string) {
    return this.hrService.searchEmployees(query, tenantId);
  }

  @Get('employees/department/:department')
  getEmployeesByDepartment(
    @Param('department') department: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.getEmployeesByDepartment(department, tenantId);
  }

  @Get('employees/:id')
  findOneEmployee(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.hrService.findOneEmployee(id, tenantId);
  }

  @Post('employees')
  createEmployee(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.createEmployee(createEmployeeDto, tenantId);
  }

  @Put('employees/:id')
  updateEmployee(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.updateEmployee(id, updateEmployeeDto, tenantId);
  }

  @Delete('employees/:id')
  async deleteEmployee(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    await this.hrService.deleteEmployee(id, tenantId);
    return { message: 'Employee deleted successfully' };
  }

  // ==================== ATTENDANCE ENDPOINTS ====================

  @Post('attendance/clock-in')
  clockIn(@Body() clockInDto: ClockInDto, @CurrentTenant() tenantId: string) {
    return this.hrService.clockIn(clockInDto, tenantId);
  }

  @Post('attendance/clock-out')
  clockOut(@Body() clockOutDto: ClockOutDto, @CurrentTenant() tenantId: string) {
    return this.hrService.clockOut(clockOutDto, tenantId);
  }

  @Post('attendance/mark')
  markAttendance(
    @Body() createAttendanceDto: CreateAttendanceDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.markAttendance(createAttendanceDto, tenantId);
  }

  @Get('attendance/employee/:employeeId')
  getEmployeeAttendance(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.getEmployeeAttendance(employeeId, startDate, endDate, tenantId);
  }

  // ==================== LEAVE TYPE ENDPOINTS ====================

  @Get('leave-types')
  getLeaveTypes(@CurrentTenant() tenantId: string) {
    return this.hrService.getLeaveTypes(tenantId);
  }

  @Post('leave-types')
  createLeaveType(
    @Body() createLeaveTypeDto: CreateLeaveTypeDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.createLeaveType(createLeaveTypeDto, tenantId);
  }

  @Put('leave-types/:id')
  updateLeaveType(
    @Param('id') id: string,
    @Body() updateLeaveTypeDto: UpdateLeaveTypeDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.updateLeaveType(id, updateLeaveTypeDto, tenantId);
  }

  // ==================== LEAVE BALANCE ENDPOINTS ====================

  @Post('leave-balance/initialize/:employeeId')
  initializeLeaveBalance(
    @Param('employeeId') employeeId: string,
    @Query('year') year: number,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.initializeLeaveBalance(employeeId, year, tenantId);
  }

  @Get('leave-balance/:employeeId')
  getLeaveBalance(
    @Param('employeeId') employeeId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.getLeaveBalance(employeeId, tenantId);
  }

  // ==================== LEAVE REQUEST ENDPOINTS ====================

  @Post('leave-requests')
  requestLeave(
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
    @Query('employeeId') employeeId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.requestLeave(createLeaveRequestDto, employeeId, tenantId);
  }

  @Get('leave-requests')
  getLeaveRequests(
    @Query('status') status: LeaveRequestStatus,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.getLeaveRequests(tenantId, status);
  }

  @Get('leave-requests/employee/:employeeId')
  getEmployeeLeaveRequests(
    @Param('employeeId') employeeId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.getEmployeeLeaveRequests(employeeId, tenantId);
  }

  @Post('leave-requests/:id/approve')
  approveLeave(
    @Param('id') id: string,
    @Body() approveLeaveDto: ApproveLeaveDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.approveLeave(id, approveLeaveDto, tenantId);
  }

  @Post('leave-requests/:id/reject')
  rejectLeave(
    @Param('id') id: string,
    @Body() rejectLeaveDto: RejectLeaveDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.rejectLeave(id, rejectLeaveDto, tenantId);
  }

  // ==================== SALARY COMPONENT ENDPOINTS ====================

  @Get('salary-components')
  getSalaryComponents(@CurrentTenant() tenantId: string) {
    return this.hrService.getSalaryComponents(tenantId);
  }

  @Post('salary-components')
  createSalaryComponent(
    @Body() createSalaryComponentDto: CreateSalaryComponentDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.createSalaryComponent(createSalaryComponentDto, tenantId);
  }

  @Put('salary-components/:id')
  updateSalaryComponent(
    @Param('id') id: string,
    @Body() updateSalaryComponentDto: UpdateSalaryComponentDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.updateSalaryComponent(id, updateSalaryComponentDto, tenantId);
  }

  // ==================== EMPLOYEE SALARY ENDPOINTS ====================

  @Post('salary-structure')
  createSalaryStructure(
    @Body() createEmployeeSalaryDto: CreateEmployeeSalaryDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.createSalaryStructure(createEmployeeSalaryDto, tenantId);
  }

  @Get('salary-structure/:employeeId')
  getSalaryStructure(
    @Param('employeeId') employeeId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.getSalaryStructure(employeeId, tenantId);
  }

  // ==================== PAYROLL ENDPOINTS ====================

  @Post('payroll/generate')
  generatePayslips(
    @Query('month') month: number,
    @Query('year') year: number,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.generatePayslips(month, year, tenantId);
  }

  @Get('payslips')
  getPayslips(
    @Query('month') month: number,
    @Query('year') year: number,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.getPayslips(tenantId, month, year);
  }

  @Get('payslips/employee/:employeeId')
  getEmployeePayslips(
    @Param('employeeId') employeeId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.getEmployeePayslips(employeeId, tenantId);
  }

  @Put('payslips/:id/status')
  updatePayslipStatus(
    @Param('id') id: string,
    @Body('status') status: PayslipStatus,
    @CurrentTenant() tenantId: string,
  ) {
    return this.hrService.updatePayslipStatus(id, status, tenantId);
  }
}
