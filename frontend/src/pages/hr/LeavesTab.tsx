import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Select, DatePicker, Space, message, Card, Row, Col, Input, InputNumber, Tabs } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/api/hr';
import dayjs from 'dayjs';

export default function LeavesTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isLeaveTypeModalOpen, setIsLeaveTypeModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [form] = Form.useForm();
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [leaveTypeForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrApi.getEmployees().then(res => res.data),
  });

  const { data: leaveTypes, isLoading: leaveTypesLoading } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: () => hrApi.getLeaveTypes().then(res => res.data),
  });

  const { data: leaveRequests, isLoading: leaveRequestsLoading } = useQuery({
    queryKey: ['leaveRequests', statusFilter],
    queryFn: () => hrApi.getLeaveRequests(statusFilter || undefined).then(res => res.data),
  });

  const requestLeaveMutation = useMutation({
    mutationFn: ({ data, employeeId }: any) => hrApi.requestLeave(data, employeeId),
    onSuccess: () => {
      message.success('Leave request submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      handleCloseModal();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to submit leave request';
      message.error(typeof msg === 'string' ? msg : msg.join(', '));
    },
  });

  const approveLeaveMutation = useMutation({
    mutationFn: ({ id, data }: any) => hrApi.approveLeave(id, data),
    onSuccess: () => {
      message.success('Leave approved');
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      setIsApproveModalOpen(false);
      approveForm.resetFields();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to approve leave';
      message.error(typeof msg === 'string' ? msg : msg.join(', '));
    },
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: ({ id, data }: any) => hrApi.rejectLeave(id, data),
    onSuccess: () => {
      message.success('Leave rejected');
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      setIsRejectModalOpen(false);
      rejectForm.resetFields();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to reject leave';
      message.error(typeof msg === 'string' ? msg : msg.join(', '));
    },
  });

  const createLeaveTypeMutation = useMutation({
    mutationFn: (data: any) => hrApi.createLeaveType(data),
    onSuccess: () => {
      message.success('Leave type created');
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
      setIsLeaveTypeModalOpen(false);
      leaveTypeForm.resetFields();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to create leave type';
      message.error(typeof msg === 'string' ? msg : msg.join(', '));
    },
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const employeeId = values.employee_id;
      const formattedValues = {
        leave_type_id: values.leave_type_id,
        start_date: values.dates[0].format('YYYY-MM-DD'),
        end_date: values.dates[1].format('YYYY-MM-DD'),
        days_count: values.dates[1].diff(values.dates[0], 'day') + 1,
        reason: values.reason,
      };
      requestLeaveMutation.mutate({ data: formattedValues, employeeId });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const employeeList: any[] = Array.isArray(employees) ? employees : (employees?.data || []);
  const leaveTypeList: any[] = Array.isArray(leaveTypes) ? leaveTypes : (leaveTypes?.data || []);
  const leaveRequestList: any[] = Array.isArray(leaveRequests) ? leaveRequests : (leaveRequests?.data || []);

  const pendingCount = leaveRequestList.filter((l: any) => l.status === 'pending').length;
  const approvedCount = leaveRequestList.filter((l: any) => l.status === 'approved').length;
  const rejectedCount = leaveRequestList.filter((l: any) => l.status === 'rejected').length;

  const leaveRequestColumns = [
    {
      title: 'Employee',
      dataIndex: 'employee',
      key: 'employee',
      render: (employee: any) => employee ? `${employee.first_name} ${employee.last_name}` : '-',
    },
    {
      title: 'Leave Type',
      dataIndex: 'leave_type',
      key: 'leave_type',
      render: (leaveType: any) => leaveType?.name || '-',
    },
    {
      title: 'Start Date',
      dataIndex: 'start_date',
      key: 'start_date',
      render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'End Date',
      dataIndex: 'end_date',
      key: 'end_date',
      render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
    },
    { title: 'Days', dataIndex: 'days_count', key: 'days_count', width: 70 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = { pending: 'orange', approved: 'green', rejected: 'red', cancelled: 'gray' };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      },
    },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: any, record: any) => {
        if (record.status === 'pending') {
          return (
            <Space>
              <Button type="link" icon={<CheckOutlined />} onClick={() => { setSelectedLeave(record); setIsApproveModalOpen(true); }}>
                Approve
              </Button>
              <Button type="link" danger icon={<CloseOutlined />} onClick={() => { setSelectedLeave(record); setIsRejectModalOpen(true); }}>
                Reject
              </Button>
            </Space>
          );
        }
        return '-';
      },
    },
  ];

  const leaveTypeColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (v: string) => v || '-' },
    { title: 'Days Allowed', dataIndex: 'days_allowed', key: 'days_allowed', width: 120 },
    {
      title: 'Carry Forward',
      dataIndex: 'carry_forward',
      key: 'carry_forward',
      width: 120,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Yes' : 'No'}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
  ];

  const tabItems = [
    {
      key: 'requests',
      label: 'Leave Requests',
      children: (
        <>
          <Row gutter={16} className="mb-4">
            <Col span={6}>
              <Card><div className="text-center"><h3 className="text-2xl font-bold text-orange-500">{pendingCount}</h3><p className="text-gray-600">Pending</p></div></Card>
            </Col>
            <Col span={6}>
              <Card><div className="text-center"><h3 className="text-2xl font-bold text-green-500">{approvedCount}</h3><p className="text-gray-600">Approved</p></div></Card>
            </Col>
            <Col span={6}>
              <Card><div className="text-center"><h3 className="text-2xl font-bold text-red-500">{rejectedCount}</h3><p className="text-gray-600">Rejected</p></div></Card>
            </Col>
            <Col span={6}>
              <Card><div className="text-center"><h3 className="text-2xl font-bold text-blue-500">{leaveTypeList.length}</h3><p className="text-gray-600">Leave Types</p></div></Card>
            </Col>
          </Row>
          <div className="mb-4 flex justify-between">
            <Select
              placeholder="Filter by Status"
              style={{ width: 200 }}
              allowClear
              onChange={setStatusFilter}
              value={statusFilter || undefined}
            >
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="approved">Approved</Select.Option>
              <Select.Option value="rejected">Rejected</Select.Option>
              <Select.Option value="cancelled">Cancelled</Select.Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
              Request Leave
            </Button>
          </div>
          <Table
            columns={leaveRequestColumns}
            dataSource={leaveRequestList}
            loading={leaveRequestsLoading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
    {
      key: 'types',
      label: 'Leave Types',
      children: (
        <>
          <div className="mb-4 flex justify-end">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsLeaveTypeModalOpen(true)}>
              Add Leave Type
            </Button>
          </div>
          <Table
            columns={leaveTypeColumns}
            dataSource={leaveTypeList}
            loading={leaveTypesLoading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Leave Management</h2>
      <Tabs items={tabItems} />

      {/* Request Leave Modal */}
      <Modal
        title="Request Leave"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={requestLeaveMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="employee_id" label="Employee" rules={[{ required: true }]}>
            <Select
              placeholder="Select Employee"
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={employeeList.map((emp: any) => ({
                value: emp.id,
                label: `${emp.first_name} ${emp.last_name} (${emp.employee_code})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="leave_type_id" label="Leave Type" rules={[{ required: true }]}>
            <Select placeholder="Select Leave Type">
              {leaveTypeList.map((type: any) => (
                <Select.Option key={type.id} value={type.id}>
                  {type.name} ({type.days_allowed} days)
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dates" label="Leave Period" rules={[{ required: true }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="Enter reason for leave..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Approve Modal */}
      <Modal
        title="Approve Leave Request"
        open={isApproveModalOpen}
        onOk={async () => {
          const values = await approveForm.validateFields();
          approveLeaveMutation.mutate({ id: selectedLeave.id, data: values });
        }}
        onCancel={() => { setIsApproveModalOpen(false); approveForm.resetFields(); }}
        confirmLoading={approveLeaveMutation.isPending}
      >
        <Form form={approveForm} layout="vertical">
          <Form.Item name="approver_id" label="Approver" rules={[{ required: true }]}>
            <Select
              placeholder="Select Approver"
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={employeeList.map((emp: any) => ({
                value: emp.id,
                label: `${emp.first_name} ${emp.last_name}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Reject Leave Request"
        open={isRejectModalOpen}
        onOk={async () => {
          const values = await rejectForm.validateFields();
          rejectLeaveMutation.mutate({ id: selectedLeave.id, data: values });
        }}
        onCancel={() => { setIsRejectModalOpen(false); rejectForm.resetFields(); }}
        confirmLoading={rejectLeaveMutation.isPending}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item name="approver_id" label="Approver" rules={[{ required: true }]}>
            <Select
              placeholder="Select Approver"
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={employeeList.map((emp: any) => ({
                value: emp.id,
                label: `${emp.first_name} ${emp.last_name}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="rejection_reason" label="Rejection Reason" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Leave Type Modal */}
      <Modal
        title="Add Leave Type"
        open={isLeaveTypeModalOpen}
        onOk={async () => {
          const values = await leaveTypeForm.validateFields();
          createLeaveTypeMutation.mutate(values);
        }}
        onCancel={() => { setIsLeaveTypeModalOpen(false); leaveTypeForm.resetFields(); }}
        confirmLoading={createLeaveTypeMutation.isPending}
      >
        <Form form={leaveTypeForm} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Annual Leave" />
          </Form.Item>
          <Form.Item name="days_allowed" label="Days Allowed per Year" rules={[{ required: true }]}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
