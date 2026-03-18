import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Select, DatePicker, message, Card, Row, Col, Input, Empty, Badge, Avatar, List } from 'antd';
import { PlusOutlined, ClockCircleOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/api/hr';
import dayjs from 'dayjs';

export default function AttendanceTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [clockInEmployee, setClockInEmployee] = useState<string | null>(null);
  const [clockOutEmployee, setClockOutEmployee] = useState<string | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrApi.getEmployees().then(res => res.data),
  });
  const employeeList: any[] = Array.isArray(employees) ? employees : [];

  const { data: todayAttendance } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => hrApi.getTodayAttendance().then(res => res.data),
    refetchInterval: 30000, // refresh every 30s
  });
  const todayList: any[] = Array.isArray(todayAttendance) ? todayAttendance : [];

  // Build a map of employeeId -> today's attendance record
  const todayMap: Record<string, any> = {};
  todayList.forEach((a: any) => { todayMap[a.employee_id] = a; });

  const startStr = dateRange[0]?.format('YYYY-MM-DD');
  const endStr = dateRange[1]?.format('YYYY-MM-DD');

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance', selectedEmployee, startStr, endStr],
    queryFn: () =>
      hrApi.getEmployeeAttendance(selectedEmployee!, startStr!, endStr!).then(res => res.data),
    enabled: !!selectedEmployee && !!startStr && !!endStr,
  });
  const attendanceList: any[] = Array.isArray(attendanceData) ? attendanceData : [];

  const clockInMutation = useMutation({
    mutationFn: (employeeId: string) => hrApi.clockIn({ employee_id: employeeId }),
    onSuccess: () => {
      message.success('Clocked in successfully');
      setClockInEmployee(null);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to clock in';
      message.error(typeof msg === 'string' ? msg : msg.join(', '));
      setClockInEmployee(null);
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: (employeeId: string) => hrApi.clockOut({ employee_id: employeeId }),
    onSuccess: () => {
      message.success('Clocked out successfully');
      setClockOutEmployee(null);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to clock out';
      message.error(typeof msg === 'string' ? msg : msg.join(', '));
      setClockOutEmployee(null);
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: (values: any) => hrApi.markAttendance(values),
    onSuccess: () => {
      message.success('Attendance marked successfully');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to mark attendance';
      message.error(typeof msg === 'string' ? msg : msg.join(', '));
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      markAttendanceMutation.mutate({
        employee_id: values.employee_id,
        date: values.date.format('YYYY-MM-DD'),
        status: values.status,
        clock_in_time: values.clock_in_time || null,
        clock_out_time: values.clock_out_time || null,
        notes: values.notes || null,
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const employeeOptions = employeeList.map((emp: any) => ({
    value: emp.id,
    label: `${emp.first_name} ${emp.last_name} (${emp.employee_code})`,
  }));

  const onlineCount = employeeList.filter((emp: any) => {
    const rec = todayMap[emp.id];
    return rec && rec.clock_in_time && !rec.clock_out_time;
  }).length;

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Clock In',
      dataIndex: 'clock_in_time',
      key: 'clock_in_time',
      render: (time: string) => time || '-',
    },
    {
      title: 'Clock Out',
      dataIndex: 'clock_out_time',
      key: 'clock_out_time',
      render: (time: string) => time || '-',
    },
    {
      title: 'Work Hours',
      dataIndex: 'work_hours',
      key: 'work_hours',
      render: (hours: number) => (hours && Number(hours) > 0) ? `${Number(hours).toFixed(2)} hrs` : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          present: 'green', absent: 'red', late: 'orange', half_day: 'gold', on_leave: 'blue',
        };
        return <Tag color={colors[status] || 'default'}>{status?.replace('_', ' ')}</Tag>;
      },
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes: string) => notes || '-',
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Attendance Management</h2>

      {/* Quick actions */}
      <Row gutter={16} className="mb-4">
        <Col span={8}>
          <Card>
            <div className="text-center">
              <ClockCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />
              <h3 className="mt-2">Quick Clock In</h3>
              <Select
                placeholder="Select Employee"
                style={{ width: '100%', marginTop: 8 }}
                value={clockInEmployee}
                onChange={(value) => setClockInEmployee(value)}
                showSearch
                filterOption={(input, option) =>
                  String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={employeeOptions}
              />
              <Button
                type="primary"
                style={{ marginTop: 8, width: '100%' }}
                disabled={!clockInEmployee}
                loading={clockInMutation.isPending}
                onClick={() => clockInEmployee && clockInMutation.mutate(clockInEmployee)}
              >
                Clock In
              </Button>
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card>
            <div className="text-center">
              <LogoutOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
              <h3 className="mt-2">Quick Clock Out</h3>
              <Select
                placeholder="Select Employee"
                style={{ width: '100%', marginTop: 8 }}
                value={clockOutEmployee}
                onChange={(value) => setClockOutEmployee(value)}
                showSearch
                filterOption={(input, option) =>
                  String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={employeeOptions}
              />
              <Button
                danger
                style={{ marginTop: 8, width: '100%' }}
                disabled={!clockOutEmployee}
                loading={clockOutMutation.isPending}
                onClick={() => clockOutEmployee && clockOutMutation.mutate(clockOutEmployee)}
              >
                Clock Out
              </Button>
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card>
            <div className="text-center">
              <PlusOutlined style={{ fontSize: 32, color: '#1890ff' }} />
              <h3 className="mt-2">Manual Entry</h3>
              <Button
                type="primary"
                style={{ marginTop: 8, width: '100%' }}
                onClick={() => setIsModalOpen(true)}
              >
                Mark Attendance
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Today's employee status */}
      <Card
        title={
          <span>
            Today's Employee Status — {dayjs().format('MMM DD, YYYY')}
            <Tag color="green" className="ml-3">{onlineCount} Online</Tag>
            <Tag color="default">{employeeList.length - onlineCount} Offline</Tag>
          </span>
        }
        className="mb-4"
      >
        {employeeList.length === 0 ? (
          <Empty description="No employees found" />
        ) : (
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 6 }}
            dataSource={employeeList}
            renderItem={(emp: any) => {
              const rec = todayMap[emp.id];
              const isOnline = rec && rec.clock_in_time && !rec.clock_out_time;
              return (
                <List.Item>
                  <Card size="small" bodyStyle={{ padding: '12px' }}>
                    <div className="flex items-center gap-2">
                      <Badge
                        dot
                        color={isOnline ? '#52c41a' : '#d9d9d9'}
                        offset={[-2, 2]}
                      >
                        <Avatar icon={<UserOutlined />} size={36} />
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {emp.first_name} {emp.last_name}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{emp.employee_code}</div>
                        {isOnline ? (
                          <Tag color="success" style={{ fontSize: 11, marginTop: 2 }}>
                            Online · {rec.clock_in_time}
                          </Tag>
                        ) : rec && rec.clock_out_time ? (
                          <Tag color="default" style={{ fontSize: 11, marginTop: 2 }}>
                            Left · {rec.clock_out_time}
                          </Tag>
                        ) : (
                          <Tag color="default" style={{ fontSize: 11, marginTop: 2 }}>
                            Offline
                          </Tag>
                        )}
                      </div>
                    </div>
                  </Card>
                </List.Item>
              );
            }}
          />
        )}
      </Card>

      {/* Attendance history */}
      <div className="mb-4 flex items-center gap-4">
        <Select
          placeholder="Select employee to view records"
          style={{ width: 300 }}
          onChange={(val) => setSelectedEmployee(val ?? null)}
          value={selectedEmployee}
          allowClear
          showSearch
          filterOption={(input, option) =>
            String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={employeeOptions}
        />
        <DatePicker.RangePicker
          value={dateRange}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setDateRange([dates[0], dates[1]]);
            }
          }}
        />
      </div>

      {!selectedEmployee ? (
        <Empty description="Select an employee above to view their attendance records" />
      ) : (
        <Table
          columns={columns}
          dataSource={attendanceList}
          loading={isLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      )}

      <Modal
        title="Mark Attendance"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        confirmLoading={markAttendanceMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="employee_id" label="Employee" rules={[{ required: true }]}>
            <Select
              placeholder="Select Employee"
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={employeeOptions}
            />
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="present">Present</Select.Option>
              <Select.Option value="absent">Absent</Select.Option>
              <Select.Option value="late">Late</Select.Option>
              <Select.Option value="half_day">Half Day</Select.Option>
              <Select.Option value="on_leave">On Leave</Select.Option>
            </Select>
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="clock_in_time" label="Clock In Time">
              <Input placeholder="09:00:00" />
            </Form.Item>
            <Form.Item name="clock_out_time" label="Clock Out Time">
              <Input placeholder="18:00:00" />
            </Form.Item>
          </div>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
