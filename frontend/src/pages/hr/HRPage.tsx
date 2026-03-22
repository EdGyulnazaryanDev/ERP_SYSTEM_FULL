import { useState, useMemo } from 'react';
import { Tabs, Row, Col, Card } from 'antd';
import { TeamOutlined, ApartmentOutlined, ClockCircleOutlined, DollarOutlined, CalendarOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { hrApi } from '@/api/hr';
import EmployeesTab from './EmployeesTab';
import DepartmentsTab from './DepartmentsTab';
import AttendanceTab from './AttendanceTab';
import PayrollTab from './PayrollTab';
import LeavesTab from './LeavesTab';
import dayjs from 'dayjs';

function StatCard({ label, value, color, icon, active, onClick }: {
  label: string; value: number | string; color: string; icon: React.ReactNode;
  active?: boolean; onClick?: () => void;
}) {
  return (
    <Card
      size="small"
      onClick={onClick}
      style={{
        borderRadius: 12,
        border: active ? `2px solid ${color}` : `1px solid ${color}22`,
        background: active ? `${color}14` : `${color}08`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s ease',
        boxShadow: active ? `0 0 0 3px ${color}22` : undefined,
        transform: active ? 'translateY(-1px)' : undefined,
      }}
      bodyStyle={{ padding: '14px 18px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: active ? `${color}28` : `${color}18`,
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', color, fontSize: 16,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, color: 'var(--app-text)' }}>{value}</div>
          <div style={{ fontSize: 12, color: active ? color : 'var(--app-text-muted)', fontWeight: active ? 600 : 400, marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </Card>
  );
}

export default function HRPage() {
  const [activeTab, setActiveTab] = useState('employees');

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrApi.getEmployees().then(res => res.data),
  });
  const { data: leaveRequestsData } = useQuery({
    queryKey: ['leaveRequests', ''],
    queryFn: () => hrApi.getLeaveRequests(undefined).then(res => res.data),
  });
  const { data: payslipsData } = useQuery({
    queryKey: ['payslips', dayjs().month() + 1, dayjs().year()],
    queryFn: () => hrApi.getPayslips(dayjs().month() + 1, dayjs().year()).then(res => res.data),
  });

  const employees = Array.isArray(employeesData) ? employeesData : (employeesData?.data || []);
  const leaveRequests = Array.isArray(leaveRequestsData) ? leaveRequestsData : (leaveRequestsData?.data || []);
  const payslips = Array.isArray(payslipsData) ? payslipsData : (payslipsData?.data || []);

  const stats = useMemo(() => {
    const departments = new Set(employees.map((e: any) => e.department).filter(Boolean));
    const onLeave = employees.filter((e: any) => e.status === 'on_leave').length;
    const totalNet = payslips.reduce((sum: number, p: any) => sum + Number(p.net_salary || 0), 0);
    return {
      totalEmployees: employees.length,
      departments: departments.size,
      onLeave,
      pendingLeaves: leaveRequests.filter((l: any) => l.status === 'pending').length,
      payrollTotal: totalNet,
    };
  }, [employees, leaveRequests, payslips]);

  const items = [
    { key: 'employees', label: 'Employees', children: <EmployeesTab /> },
    { key: 'departments', label: 'Departments', children: <DepartmentsTab /> },
    { key: 'attendance', label: 'Attendance', children: <AttendanceTab /> },
    { key: 'payroll', label: 'Payroll', children: <PayrollTab /> },
    { key: 'leaves', label: 'Leaves', children: <LeavesTab /> },
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--app-text)' }}>
            <TeamOutlined style={{ marginRight: 10, color: '#1677ff' }} />
            Human Resources
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--app-text-muted)', fontSize: 13 }}>
            Employees, attendance, payroll and leave management
          </p>
        </div>
      </div>

      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard label="Total Employees" value={stats.totalEmployees} color="#1677ff" icon={<TeamOutlined />}
            active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} />
        </Col>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard label="Departments" value={stats.departments} color="#722ed1" icon={<ApartmentOutlined />}
            active={activeTab === 'departments'} onClick={() => setActiveTab('departments')} />
        </Col>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard label="On Leave" value={stats.onLeave} color="#fa8c16" icon={<CalendarOutlined />}
            active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} />
        </Col>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard label="Pending Leaves" value={stats.pendingLeaves} color="#13c2c2" icon={<ClockCircleOutlined />}
            active={activeTab === 'leaves'} onClick={() => setActiveTab('leaves')} />
        </Col>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard label="Payroll This Month" value={`$${stats.payrollTotal.toFixed(0)}`} color="#52c41a" icon={<DollarOutlined />}
            active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} />
        </Col>
      </Row>

      <Card
        style={{
          borderRadius: 16,
          background: 'rgba(8, 25, 40, 0.72)',
          border: '1px solid rgba(134, 166, 197, 0.12)',
          boxShadow: '0 20px 50px rgba(2, 10, 19, 0.2)',
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={items}
          style={{ padding: '0 20px' }}
          tabBarStyle={{ marginBottom: 0 }}
        />
      </Card>
    </div>
  );
}
