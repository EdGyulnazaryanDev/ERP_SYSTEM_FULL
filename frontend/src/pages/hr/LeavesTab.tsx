import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Select, DatePicker, Space, message, Row, Col, Card, Input, InputNumber, Tabs } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/api/hr';
import dayjs from 'dayjs';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: '#fa8c16', bg: '#fff7e6', label: 'Pending' },
  approved:  { color: '#52c41a', bg: '#f6ffed', label: 'Approved' },
  rejected:  { color: '#ff4d4f', bg: '#fff2f0', label: 'Rejected' },
  cancelled: { color: '#8c8c8c', bg: '#fafafa', label: 'Cancelled' },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { color: '#8c8c8c', bg: '#fafafa', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      fontSize: 11, fontWeight: 600,
    }}>
      {cfg.label.toUpperCase()}
    </span>
  );
}

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

  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: () => hrApi.getEmployees().then(res => res.data) });
  const { data: leaveTypes, isLoading: leaveTypesLoading } = useQuery({ queryKey: ['leaveTypes'], queryFn: () => hrApi.getLeaveTypes().then(res => res.data) });
  const { data: leaveRequests, isLoading: leaveRequestsLoading } = useQuery({ queryKey: ['leaveRequests', statusFilter], queryFn: () => hrApi.getLeaveRequests(statusFilter || undefined).then(res => res.data) });

  const requestLeaveMutation = useMutation({
    mutationFn: ({ data, employeeId }: any) => hrApi.requestLeave(data, employeeId),
    onSuccess: () => { message.success('Leave request submitted'); queryClient.invalidateQueries({ queryKey: ['leaveRequests'] }); setIsModalOpen(false); form.resetFields(); },
    onError: (e: any) => { const msg = e.response?.data?.message || 'Failed'; message.error(typeof msg === 'string' ? msg : msg.join(', ')); },
  });
  const approveLeaveMutation = useMutation({
    mutationFn: ({ id, data }: any) => hrApi.approveLeave(id, data),
    onSuccess: () => { message.success('Leave approved'); queryClient.invalidateQueries({ queryKey: ['leaveRequests'] }); setIsApproveModalOpen(false); approveForm.resetFields(); },
    onError: (e: any) => { const msg = e.response?.data?.message || 'Failed'; message.error(typeof msg === 'string' ? msg : msg.join(', ')); },
  });
  const rejectLeaveMutation = useMutation({
    mutationFn: ({ id, data }: any) => hrApi.rejectLeave(id, data),
    onSuccess: () => { message.success('Leave rejected'); queryClient.invalidateQueries({ queryKey: ['leaveRequests'] }); setIsRejectModalOpen(false); rejectForm.resetFields(); },
    onError: (e: any) => { const msg = e.response?.data?.message || 'Failed'; message.error(typeof msg === 'string' ? msg : msg.join(', ')); },
  });
  const createLeaveTypeMutation = useMutation({
    mutationFn: (data: any) => hrApi.createLeaveType(data),
    onSuccess: () => { message.success('Leave type created'); queryClient.invalidateQueries({ queryKey: ['leaveTypes'] }); setIsLeaveTypeModalOpen(false); leaveTypeForm.resetFields(); },
    onError: (e: any) => { const msg = e.response?.data?.message || 'Failed'; message.error(typeof msg === 'string' ? msg : msg.join(', ')); },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const employeeId = values.employee_id;
      const formattedValues = { leave_type_id: values.leave_type_id, start_date: values.dates[0].format('YYYY-MM-DD'), end_date: values.dates[1].format('YYYY-MM-DD'), days_count: values.dates[1].diff(values.dates[0], 'day') + 1, reason: values.reason };
      requestLeaveMutation.mutate({ data: formattedValues, employeeId });
    } catch (e) { console.error(e); }
  };

  const employeeList: any[] = Array.isArray(employees) ? employees : (employees?.data || []);
  const leaveTypeList: any[] = Array.isArray(leaveTypes) ? leaveTypes : (leaveTypes?.data || []);
  const leaveRequestList: any[] = Array.isArray(leaveRequests) ? leaveRequests : (leaveRequests?.data || []);

  const pendingCount = leaveRequestList.filter((l: any) => l.status === 'pending').length;
  const approvedCount = leaveRequestList.filter((l: any) => l.status === 'approved').length;
  const rejectedCount = leaveRequestList.filter((l: any) => l.status === 'rejected').length;

  const leaveRequestColumns = [
    { title: 'Employee', dataIndex: 'employee', key: 'employee', render: (emp: any) => emp ? <span style={{ fontWeight: 600 }}>{emp.first_name} {emp.last_name}</span> : '-' },
    { title: 'Leave Type', dataIndex: 'leave_type', key: 'leave_type', render: (lt: any) => lt?.name ? <Tag color="geekblue" style={{ fontSize: 11 }}>{lt.name}</Tag> : '-' },
    { title: 'Start', dataIndex: 'start_date', key: 'start_date', render: (d: string) => dayjs(d).format('MMM DD, YYYY') },
    { title: 'End', dataIndex: 'end_date', key: 'end_date', render: (d: string) => dayjs(d).format('MMM DD, YYYY') },
    { title: 'Days', dataIndex: 'days_count', key: 'days_count', width: 60 },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (status: string) => <StatusPill status={status} /> },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true },
    {
      title: 'Actions', key: 'actions', width: 160,
      render: (_: any, record: any) => record.status === 'pending' ? (
        <Space size={4}>
          <Button type="primary" size="small" icon={<CheckOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={() => { setSelectedLeave(record); setIsApproveModalOpen(true); }}>Approve</Button>
          <Button danger size="small" icon={<CloseOutlined />} onClick={() => { setSelectedLeave(record); setIsRejectModalOpen(true); }}>Reject</Button>
        </Space>
      ) : '-',
    },
  ];

  const leaveTypeColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (v: string) => v || '-' },
    { title: 'Days Allowed', dataIndex: 'days_allowed', key: 'days_allowed', width: 120 },
    { title: 'Carry Forward', dataIndex: 'carry_forward', key: 'carry_forward', width: 120, render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Yes' : 'No'}</Tag> },
    { title: 'Status', dataIndex: 'is_active', key: 'is_active', width: 100, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
  ];

  const tabItems = [
    {
      key: 'requests',
      label: 'Leave Requests',
      children: (
        <div style={{ padding: '16px 0' }}>
          <Row gutter={12} style={{ marginBottom: 16 }}>
            {[
              { label: 'Pending', value: pendingCount, color: '#fa8c16' },
              { label: 'Approved', value: approvedCount, color: '#52c41a' },
              { label: 'Rejected', value: rejectedCount, color: '#ff4d4f' },
              { label: 'Leave Types', value: leaveTypeList.length, color: '#1677ff' },
            ].map((stat, i) => (
              <Col key={i} xs={12} sm={6}>
                <Card size="small" style={{ borderRadius: 10, border: `1px solid ${stat.color}22`, background: `${stat.color}08`, textAlign: 'center' }} bodyStyle={{ padding: '12px' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>{stat.label}</div>
                </Card>
              </Col>
            ))}
          </Row>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <Select placeholder="Filter by Status" style={{ width: 200 }} allowClear onChange={setStatusFilter} value={statusFilter || undefined}>
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="approved">Approved</Select.Option>
              <Select.Option value="rejected">Rejected</Select.Option>
              <Select.Option value="cancelled">Cancelled</Select.Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }} onClick={() => setIsModalOpen(true)}>Request Leave</Button>
          </div>
          <Table
            columns={leaveRequestColumns}
            dataSource={leaveRequestList}
            loading={leaveRequestsLoading}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
            rowClassName={(record: any) => {
              if (record.status === 'approved') return 'row-approved';
              if (record.status === 'rejected') return 'row-rejected';
              return '';
            }}
          />
        </div>
      ),
    },
    {
      key: 'types',
      label: 'Leave Types',
      children: (
        <div style={{ padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }} onClick={() => setIsLeaveTypeModalOpen(true)}>Add Leave Type</Button>
          </div>
          <Table columns={leaveTypeColumns} dataSource={leaveTypeList} loading={leaveTypesLoading} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <Tabs items={tabItems} />

      <Modal title="Request Leave" open={isModalOpen} onOk={handleSubmit} onCancel={() => { setIsModalOpen(false); form.resetFields(); }} confirmLoading={requestLeaveMutation.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="employee_id" label="Employee" rules={[{ required: true }]}>
            <Select placeholder="Select Employee" showSearch filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={employeeList.map((emp: any) => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name} (${emp.employee_code})` }))} />
          </Form.Item>
          <Form.Item name="leave_type_id" label="Leave Type" rules={[{ required: true }]}>
            <Select placeholder="Select Leave Type">
              {leaveTypeList.map((type: any) => <Select.Option key={type.id} value={type.id}>{type.name} ({type.days_allowed} days)</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="dates" label="Leave Period" rules={[{ required: true }]}><DatePicker.RangePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Approve Leave Request" open={isApproveModalOpen}
        onOk={async () => { const values = await approveForm.validateFields(); approveLeaveMutation.mutate({ id: selectedLeave.id, data: values }); }}
        onCancel={() => { setIsApproveModalOpen(false); approveForm.resetFields(); }}
        confirmLoading={approveLeaveMutation.isPending}
      >
        <Form form={approveForm} layout="vertical">
          <Form.Item name="approver_id" label="Approver" rules={[{ required: true }]}>
            <Select placeholder="Select Approver" showSearch filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={employeeList.map((emp: any) => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Reject Leave Request" open={isRejectModalOpen}
        onOk={async () => { const values = await rejectForm.validateFields(); rejectLeaveMutation.mutate({ id: selectedLeave.id, data: values }); }}
        onCancel={() => { setIsRejectModalOpen(false); rejectForm.resetFields(); }}
        confirmLoading={rejectLeaveMutation.isPending}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item name="approver_id" label="Approver" rules={[{ required: true }]}>
            <Select placeholder="Select Approver" showSearch filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={employeeList.map((emp: any) => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))} />
          </Form.Item>
          <Form.Item name="rejection_reason" label="Rejection Reason" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Add Leave Type" open={isLeaveTypeModalOpen}
        onOk={async () => { const values = await leaveTypeForm.validateFields(); createLeaveTypeMutation.mutate(values); }}
        onCancel={() => { setIsLeaveTypeModalOpen(false); leaveTypeForm.resetFields(); }}
        confirmLoading={createLeaveTypeMutation.isPending}
      >
        <Form form={leaveTypeForm} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input placeholder="e.g. Annual Leave" /></Form.Item>
          <Form.Item name="days_allowed" label="Days Allowed per Year" rules={[{ required: true }]}><InputNumber min={1} className="w-full" /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-approved td { background: rgba(34, 197, 94, 0.12) !important; }
        .row-rejected td { background: rgba(239, 68, 68, 0.12) !important; opacity: 0.82; }
      `}</style>
    </div>
  );
}
