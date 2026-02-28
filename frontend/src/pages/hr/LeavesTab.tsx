import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Select, DatePicker, Space, message, Card, Row, Col, Input } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/api/hr';
import dayjs from 'dayjs';

export default function LeavesTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [form] = Form.useForm();
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrApi.getEmployees().then(res => res.data),
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: () => hrApi.getLeaveTypes().then(res => res.data),
  });

  const { data: leaveRequests, isLoading } = useQuery({
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
      message.error(error.response?.data?.message || 'Failed to submit leave request');
    },
  });

  const approveLeaveMutation = useMutation({
    mutationFn: ({ id, data }: any) => hrApi.approveLeave(id, data),
    onSuccess: () => {
      message.success('Leave approved successfully');
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      setIsApproveModalOpen(false);
      approveForm.resetFields();
    },
    onError: () => message.error('Failed to approve leave'),
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: ({ id, data }: any) => hrApi.rejectLeave(id, data),
    onSuccess: () => {
      message.success('Leave rejected successfully');
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      setIsRejectModalOpen(false);
      rejectForm.resetFields();
    },
    onError: () => message.error('Failed to reject leave'),
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = {
        leave_type_id: values.leave_type_id,
        start_date: values.dates[0].format('YYYY-MM-DD'),
        end_date: values.dates[1].format('YYYY-MM-DD'),
        days_count: values.dates[1].diff(values.dates[0], 'day') + 1,
        reason: values.reason,
      };
      requestLeaveMutation.mutate({ data: formattedValues, employeeId: values.employee_id });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleApprove = (leave: any) => {
    setSelectedLeave(leave);
    setIsApproveModalOpen(true);
  };

  const handleReject = (leave: any) => {
    setSelectedLeave(leave);
    setIsRejectModalOpen(true);
  };

  const handleApproveSubmit = async () => {
    try {
      const values = await approveForm.validateFields();
      approveLeaveMutation.mutate({ id: selectedLeave.id, data: values });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleRejectSubmit = async () => {
    try {
      const values = await rejectForm.validateFields();
      rejectLeaveMutation.mutate({ id: selectedLeave.id, data: values });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const columns = [
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
    {
      title: 'Days',
      dataIndex: 'days_count',
      key: 'days_count',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: any = {
          PENDING: 'orange',
          APPROVED: 'green',
          REJECTED: 'red',
          CANCELLED: 'gray',
        };
        return <Tag color={colors[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => {
        if (record.status === 'PENDING') {
          return (
            <Space>
              <Button
                type="link"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(record)}
              >
                Approve
              </Button>
              <Button
                type="link"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleReject(record)}
              >
                Reject
              </Button>
            </Space>
          );
        }
        return '-';
      },
    },
  ];

  const pendingCount = leaveRequests?.data?.filter((l: any) => l.status === 'PENDING').length || 0;
  const approvedCount = leaveRequests?.data?.filter((l: any) => l.status === 'APPROVED').length || 0;
  const rejectedCount = leaveRequests?.data?.filter((l: any) => l.status === 'REJECTED').length || 0;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-4">Leave Management</h2>

        <Row gutter={16} className="mb-4">
          <Col span={6}>
            <Card>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-orange-500">{pendingCount}</h3>
                <p className="text-gray-600">Pending Requests</p>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-green-500">{approvedCount}</h3>
                <p className="text-gray-600">Approved</p>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-red-500">{rejectedCount}</h3>
                <p className="text-gray-600">Rejected</p>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-blue-500">{leaveTypes?.data?.length || 0}</h3>
                <p className="text-gray-600">Leave Types</p>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <div className="mb-4 flex justify-between">
        <Space>
          <Select
            placeholder="Filter by Status"
            style={{ width: 200 }}
            allowClear
            onChange={setStatusFilter}
            value={statusFilter || undefined}
          >
            <Select.Option value="PENDING">Pending</Select.Option>
            <Select.Option value="APPROVED">Approved</Select.Option>
            <Select.Option value="REJECTED">Rejected</Select.Option>
            <Select.Option value="CANCELLED">Cancelled</Select.Option>
          </Select>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          Request Leave
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={leaveRequests?.data || []}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="Request Leave"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={requestLeaveMutation.isPending}
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
            name="leave_type_id"
            label="Leave Type"
            rules={[{ required: true, message: 'Please select leave type' }]}
          >
            <Select placeholder="Select Leave Type">
              {leaveTypes?.data?.map((type: any) => (
                <Select.Option key={type.id} value={type.id}>
                  {type.name} ({type.days_allowed} days)
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="dates"
            label="Leave Period"
            rules={[{ required: true, message: 'Please select leave period' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Please enter reason' }]}
          >
            <Input.TextArea rows={4} placeholder="Enter reason for leave..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Approve Leave Request"
        open={isApproveModalOpen}
        onOk={handleApproveSubmit}
        onCancel={() => {
          setIsApproveModalOpen(false);
          approveForm.resetFields();
        }}
        confirmLoading={approveLeaveMutation.isPending}
      >
        <Form form={approveForm} layout="vertical">
          <Form.Item
            name="approver_id"
            label="Approver"
            rules={[{ required: true, message: 'Please select approver' }]}
          >
            <Select
              placeholder="Select Approver"
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={employees?.data?.map((emp: any) => ({
                value: emp.id,
                label: `${emp.first_name} ${emp.last_name}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Reject Leave Request"
        open={isRejectModalOpen}
        onOk={handleRejectSubmit}
        onCancel={() => {
          setIsRejectModalOpen(false);
          rejectForm.resetFields();
        }}
        confirmLoading={rejectLeaveMutation.isPending}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="approver_id"
            label="Approver"
            rules={[{ required: true, message: 'Please select approver' }]}
          >
            <Select
              placeholder="Select Approver"
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={employees?.data?.map((emp: any) => ({
                value: emp.id,
                label: `${emp.first_name} ${emp.last_name}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="rejection_reason"
            label="Rejection Reason"
            rules={[{ required: true, message: 'Please enter rejection reason' }]}
          >
            <Input.TextArea rows={4} placeholder="Enter reason for rejection..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
