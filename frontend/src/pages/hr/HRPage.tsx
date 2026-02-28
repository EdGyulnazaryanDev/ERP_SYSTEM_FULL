import { Tabs } from 'antd';
import EmployeesTab from './EmployeesTab';
import DepartmentsTab from './DepartmentsTab';
import AttendanceTab from './AttendanceTab';
import PayrollTab from './PayrollTab';
import LeavesTab from './LeavesTab';

export default function HRPage() {
  const items = [
    { key: 'employees', label: 'Employees', children: <EmployeesTab /> },
    { key: 'departments', label: 'Departments', children: <DepartmentsTab /> },
    { key: 'attendance', label: 'Attendance', children: <AttendanceTab /> },
    { key: 'payroll', label: 'Payroll', children: <PayrollTab /> },
    { key: 'leaves', label: 'Leaves', children: <LeavesTab /> },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Human Resources</h1>
      <Tabs items={items} />
    </div>
  );
}
