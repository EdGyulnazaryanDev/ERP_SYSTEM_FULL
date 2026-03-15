import { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Select, Space } from 'antd';
import { TeamOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { hrApi } from '@/api/hr';

export default function DepartmentsTab() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrApi.getEmployees().then(res => res.data),
  });

  const employeeList = Array.isArray(employees) ? employees : (employees?.data || []);

  const departments = Array.from(
    new Set(employeeList.map((emp: any) => emp.department).filter(Boolean))
  );

  const getDepartmentStats = (dept: string) => {
    const deptEmployees = employeeList.filter((emp: any) => emp.department === dept);
    return {
      total: deptEmployees.length,
      active: deptEmployees.filter((emp: any) => emp.status === 'active').length,
      inactive: deptEmployees.filter((emp: any) => emp.status !== 'active').length,
    };
  };

  const filteredEmployees = selectedDepartment
    ? employeeList.filter((emp: any) => emp.department === selectedDepartment)
    : employeeList;

  const columns = [
    {
      title: 'Code',
      dataIndex: 'employee_code',
      key: 'employee_code',
      width: 100,
    },
    {
      title: 'Name',
      key: 'name',
      render: (_: any, record: any) => `${record.first_name} ${record.last_name}`,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Type',
      dataIndex: 'employment_type',
      key: 'employment_type',
      render: (type: string) => {
        const colors: Record<string, string> = {
          full_time: 'blue',
          part_time: 'cyan',
          contract: 'purple',
          intern: 'orange',
        };
        return <Tag color={colors[type] || 'default'}>{type?.replace('_', ' ')}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-4">Departments Overview</h2>

        <Row gutter={[16, 16]}>
          {departments.map((dept: any) => {
            const stats = getDepartmentStats(dept);
            return (
              <Col key={dept} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  onClick={() => setSelectedDepartment(dept)}
                  className={selectedDepartment === dept ? 'border-blue-500 border-2' : ''}
                >
                  <div className="text-center">
                    <TeamOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                    <h3 className="text-lg font-semibold mt-2">{dept}</h3>
                    <div className="mt-4">
                      <Statistic
                        title="Total Employees"
                        value={stats.total}
                        prefix={<UserOutlined />}
                      />
                      <div className="mt-2 flex justify-around text-sm">
                        <span className="text-green-600">Active: {stats.active}</span>
                        <span className="text-red-600">Inactive: {stats.inactive}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>

      <div className="mt-6">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {selectedDepartment ? `${selectedDepartment} Employees` : 'All Employees'}
          </h3>
          <Space>
            <Select
              placeholder="Filter by Department"
              style={{ width: 200 }}
              allowClear
              value={selectedDepartment || undefined}
              onChange={(value) => setSelectedDepartment(value || '')}
            >
              {departments.map((dept: any) => (
                <Select.Option key={dept} value={dept}>
                  {dept}
                </Select.Option>
              ))}
            </Select>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredEmployees || []}
          loading={isLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </div>
    </div>
  );
}
