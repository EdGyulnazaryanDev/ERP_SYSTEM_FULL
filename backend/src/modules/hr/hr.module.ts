import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { EmploymentContractService } from './employment-contract.service';
import { EmployeeEntity } from './entities/employee.entity';
import { AttendanceEntity } from './entities/attendance.entity';
import { LeaveTypeEntity } from './entities/leave-type.entity';
import { LeaveBalanceEntity } from './entities/leave-balance.entity';
import { LeaveRequestEntity } from './entities/leave-request.entity';
import { SalaryComponentEntity } from './entities/salary-component.entity';
import { EmployeeSalaryEntity } from './entities/employee-salary.entity';
import { PayslipEntity } from './entities/payslip.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmployeeEntity,
      AttendanceEntity,
      LeaveTypeEntity,
      LeaveBalanceEntity,
      LeaveRequestEntity,
      SalaryComponentEntity,
      EmployeeSalaryEntity,
      PayslipEntity,
    ]),
  ],
  controllers: [HrController],
  providers: [HrService, EmploymentContractService],
  exports: [HrService],
})
export class HrModule {}
