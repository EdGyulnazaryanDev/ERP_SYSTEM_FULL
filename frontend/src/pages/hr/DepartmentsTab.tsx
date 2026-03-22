import { useState } from 'react';
import { Row, Col, Card, Table, Tag, Select, Space, Statistic } from 'antd';
import { TeamOutlined, UserOutlined, ApartmentOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { hrApi } from '@/api/hr';

export default function DepartmentsTab() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrApi.getEmployees().then(res => res.data),
  });

  const employeeList = Array.isArray(employees) ? employees : (employees?.data || []);
  const departments = Array.from(new Set(employeeList.map((emp: any) => emp.department).filter(Boolean)));

  const getDeptStats = (dept: string) => {
    const deptEmps = employeeList.filter((emp: any) => emp.department === dept);
    return {
      total: deptEmps.length,
      active: deptEmps.filter((emp: any) => emp.status === 'active').length,
      onLeave: deptEmps.filter((emp: any) => emp.status === 'on_leave').length,
    };
  };

  const DEPT_COLORS = ['#1677ff', '#52c41a', '#722ed1', '#fa8c16', '#13c2c2', '#eb2f96', '#ff4d4f', '#faad14'];

  const filteredEmployees = selectedDepartment
    ? employeeList.filter((emp: any) => emp.department === selectedDepartment)
    : employeeList;

  const columns = [
    { title: 'Code', dataIndex: 'employee_code', key: 'employee_code', width: 100,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--app-text-muted)' }}>{v}</span> },
    { title: 'Name', key: 'name', render: (_: any, r: any) => <span style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</span> },
    { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
    { title: 'Position', dataIndex: 'position', key: 'position' },
    { title: 'Department', dataIndex: 'department', key: 'department',
      render: (dept: string) => dept ? <Tag color="geekblue" style={{ fontSize: 11 }}>{dept}</Tag> : null },
    { title: 'Type', dataIndex: 'employment_type', key: 'employment_type',
      render: (type: string) => {
        const colors: Record<string, string> = { full_time: 'blue', part_time: 'cyan', contract: 'purple', intern: 'orange' };
        return type ? <Tag color={colors[type] || 'default'} style={{ fontSize: 11 }}>{type.replace('_', ' ')}</Tag> : null;
      }
    },
    { title: 'Status', dataIndex: 'status', key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = { active: 'green', inactive: 'default', on_leave: 'orange', terminated: 'red' };
        return status ? <Tag color={colors[status] || 'default'} style={{ fontSize: 11 }}>{status.replace('_', ' ')}</Tag> : null;
      }
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ marginBottom: 20 }}>
        <Row gutter={[12, 12]}>
          {departments.map((dept: any, idx: number) => {
            const stats = getDeptStats(dept);
            const color = DEPT_COLORS[idx % DEPT_COLORS.length];
            const isSelected = selectedDepartment === dept;
            return (
              <Col key={dept} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  onClick={() => setSelectedDepartment(isSelected ? '' : dept)}
                  style={{
                    borderRadius: 12,
                    border: isSelected ? `2px solid ${color}` : `1px solid ${color}22`,
                    background: isSelected ? `${color}10` : `${color}06`,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    transform: isSelected ? 'translateY(-2px)' : undefined,
                    boxShadow: isSelected ? `0 4px 12px ${color}22` : undefined,
                  }}
                  bodyStyle={{ padding: '16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 20 }}>
                      <ApartmentOutlined />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--app-text)' }}>{dept}</div>
                      <div style={{ fontSize: 12, color: 'var(--app-text-muted)', marginTop: 2 }}>
                        <span style={{ color: '#52c41a', fontWeight: 600 }}>{stats.active} active</span>
                        {stats.onLeave > 0 && <span style={{ color: '#fa8c16', marginLeft: 8 }}>{stats.onLeave} on leave</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color }}>{stats.total}</div>
                      <div style={{ fontSize: 11, color: 'var(--app-text-muted)' }}>employees</div>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--app-text)' }}>
          {selectedDepartment ? `${selectedDepartment} — ${filteredEmployees.length} employees` : `All Employees — ${filteredEmployees.length}`}
        </span>
        <Select
          placeholder="Filter by Department"
          style={{ width: 200 }}
          allowClear
          value={selectedDepartment || undefined}
          onChange={value => setSelectedDepartment(value || '')}
        >
          {departments.map((dept: any) => <Select.Option key={dept} value={dept}>{dept}</Select.Option>)}
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={filteredEmployees}
        loading={isLoading}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
      />
    </div>
  );
}
