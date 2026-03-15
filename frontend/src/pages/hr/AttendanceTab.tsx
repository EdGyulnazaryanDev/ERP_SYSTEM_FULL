import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Select, DatePicker, Space, message, Card, Row, Col, Input } from 'antd';
import { PlusOutlined, ClockCircleOutlined, LogoutOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/api/hr';
import dayjs from 'dayjs';

export default function AttendanceTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrApi.getEmployees().then(res => res.data),
  });

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['attendance', selectedEmployee, dateRange[0]?.format('YYYY-MM-DD'), dateRange[1]?.format('YYYY-MM-DD')],
    queryFn: () => {
      if (!selectedEmployee) return Promise.resolve({ data: [] });
      return hrApi.getEmployeeAttendance(
        selectedEmployee,
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      ).then(res => res.data);
    },
    enabled: !!selectedEmployee,
  });

  const clockInMutation = useMutation({
    mutationFn: (employeeId: string) => hrApi.clockIn({ employee_id: employeeId }),
    onSuccess: () => {
      message.success('Clocked in successfully');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to clock in');
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: (employeeId: string) => hrApi.clockOut({ employee_id: employeeId }),
    onSuccess: () => {
      message.success('Clocked out successfully');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to clock out');
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: (values: any) => hrApi.markAttendance(values),
    onSuccess: () => {
      message.success('Attendance marked successfully');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      handleCloseModal();
    },
    onError: () => message.error('Failed to mark attendance'),
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = {
        employee_id: values.employee_id,
        date: values.date.format('YYYY-MM-DD'),
        status: values.status,
        clock_in_time: values.clock_in_time || null,
        clock_out_time: values.clock_out_time || null,
        notes: values.notes || null,
      };
      markAttendanceMutation.mutate(formattedValues);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

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
      render: (hours: number) => hours ? `${hours.toFixed(2)} hrs` : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          present: 'green',
          absent: 'red',
          late: 'orange',
          half_day: 'gold',
          on_leave: 'blue',
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
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
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-4">Attendance Management</h2>

        <Row gutter={16} className="mb-4">
          <Col span={8}>
            <Card>
              <div className="text-center">
                <ClockCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                <h3 className="mt-2">Quick Clock In</h3>
                <Select
                  placeholder="Select Employee"
                  style={{ width: '100%', marginTop: 8 }}
                  onChange={(value) => {
                    clockInMutation.mutate(value);
                  }}
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={employees?.data?.map((emp: any) => ({
                    value: emp.id,
                    label: `${emp.first_name} ${emp.last_name} (${emp.employee_code})`,
                  }))}
                />
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
                  onChange={(value) => {
                    clockOutMutation.mutate(value);
                  }}
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={employees?.data?.map((emp: any) => ({
                    value: emp.id,
                    label: `${emp.first_name} ${emp.last_name} (${emp.employee_code})`,
                  }))}
                />
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
      </div>

      <div className="mb-4 flex justify-between items-center">
        <Space>
          <Select
            placeholder="Select Employee"
            style={{ width: 250 }}
            onChange={setSelectedEmployee}
            value={selectedEmployee}
            showSearch
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={employees?.data?.map((emp: any) => ({
              value: emp.id,
              label: `${emp.first_name} ${emp.last_name} (${emp.employee_code})`,
            }))}
          />
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
          />
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={attendance?.data || []}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="Mark Attendance"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={markAttendanceMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="employee_id"
            label="Employee"
            rules={[{ required: true, message: 'Please select employee' }]}
          >
            <Select
              placeholder="Select Employee"
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={employees?.data?.map((emp: any) => ({
                value: emp.id,
                label: `${emp.first_name} ${emp.last_name} (${emp.employee_code})`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
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
