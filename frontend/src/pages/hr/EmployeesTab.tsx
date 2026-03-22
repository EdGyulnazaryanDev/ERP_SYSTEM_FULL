import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, DatePicker, Space, Popconfirm, message, Tabs, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DollarOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/api/hr';
import dayjs from 'dayjs';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  active:     { color: '#52c41a', bg: '#f6ffed', label: 'Active' },
  inactive:   { color: '#8c8c8c', bg: '#fafafa', label: 'Inactive' },
  on_leave:   { color: '#fa8c16', bg: '#fff7e6', label: 'On Leave' },
  terminated: { color: '#ff4d4f', bg: '#fff2f0', label: 'Terminated' },
};

const TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  full_time: { color: '#1677ff', label: 'Full Time' },
  part_time: { color: '#13c2c2', label: 'Part Time' },
  contract:  { color: '#722ed1', label: 'Contract' },
  intern:    { color: '#fa8c16', label: 'Intern' },
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

export default function EmployeesTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form] = Form.useForm();
  const [salaryForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrApi.getEmployees().then(res => res.data),
  });
  const { data: salaryData, isLoading: salaryLoading } = useQuery({
    queryKey: ['salaryStructures'],
    queryFn: () => hrApi.getAllSalaryStructures().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => hrApi.createEmployee(values),
    onSuccess: () => { message.success('Employee created'); queryClient.invalidateQueries({ queryKey: ['employees'] }); handleCloseModal(); },
    onError: (e: any) => { const msg = e.response?.data?.message || 'Failed'; message.error(typeof msg === 'string' ? msg : msg.join(', ')); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, values }: any) => hrApi.updateEmployee(id, values),
    onSuccess: () => { message.success('Employee updated'); queryClient.invalidateQueries({ queryKey: ['employees'] }); handleCloseModal(); },
    onError: (e: any) => { const msg = e.response?.data?.message || 'Failed'; message.error(typeof msg === 'string' ? msg : msg.join(', ')); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => hrApi.deleteEmployee(id),
    onSuccess: () => { message.success('Employee deleted'); queryClient.invalidateQueries({ queryKey: ['employees'] }); },
    onError: (e: any) => { const msg = e.response?.data?.message || 'Failed'; message.error(typeof msg === 'string' ? msg : msg.join(', ')); },
  });
  const createSalaryMutation = useMutation({
    mutationFn: (data: any) => hrApi.createSalaryStructure(data),
    onSuccess: () => { message.success('Salary structure saved'); queryClient.invalidateQueries({ queryKey: ['salaryStructures'] }); setIsSalaryModalOpen(false); salaryForm.resetFields(); },
    onError: (e: any) => { const msg = e.response?.data?.message || 'Failed'; message.error(typeof msg === 'string' ? msg : msg.join(', ')); },
  });

  const handleOpenModal = (employee?: any) => {
    if (employee) {
      setEditingEmployee(employee); setIsModalOpen(true);
      setTimeout(() => form.setFieldsValue({ ...employee, date_of_birth: employee.date_of_birth ? dayjs(employee.date_of_birth) : null, hire_date: employee.hire_date ? dayjs(employee.hire_date) : null }), 0);
    } else {
      setEditingEmployee(null); setIsModalOpen(true);
      setTimeout(() => form.resetFields(), 0);
    }
  };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingEmployee(null); setTimeout(() => form.resetFields(), 0); };
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const formatted = { ...values, date_of_birth: values.date_of_birth ? values.date_of_birth.format('YYYY-MM-DD') : null, hire_date: values.hire_date ? values.hire_date.format('YYYY-MM-DD') : null };
      if (editingEmployee) updateMutation.mutate({ id: editingEmployee.id, values: formatted });
      else createMutation.mutate(formatted);
    } catch (e) { console.error(e); }
  };

  const employees: any[] = Array.isArray(data) ? data : (data?.data || []);
  const salaryList: any[] = Array.isArray(salaryData) ? salaryData : (salaryData?.data || []);

  const filteredData = searchQuery
    ? employees.filter((emp: any) => `${emp.first_name} ${emp.last_name} ${emp.email} ${emp.employee_code}`.toLowerCase().includes(searchQuery.toLowerCase()))
    : employees;

  const employeeColumns = [
    { title: 'Code', dataIndex: 'employee_code', key: 'employee_code', width: 100,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--app-text-muted)' }}>{v}</span> },
    { title: 'Name', key: 'name', render: (_: any, r: any) => <span style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</span> },
    { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
    { title: 'Department', dataIndex: 'department', key: 'department',
      render: (dept: string) => dept ? <Tag color="geekblue" style={{ fontSize: 11 }}>{dept}</Tag> : null },
    { title: 'Position', dataIndex: 'position', key: 'position' },
    { title: 'Type', dataIndex: 'employment_type', key: 'employment_type', width: 110,
      render: (type: string) => {
        const cfg = TYPE_CONFIG[type] || { color: '#8c8c8c', label: type };
        return type ? <Tag color={cfg.color} style={{ fontSize: 11 }}>{cfg.label}</Tag> : null;
      }
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 120,
      render: (status: string) => status ? <StatusPill status={status} /> : null },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
          <Popconfirm title="Delete employee?" description="Are you sure?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Yes" cancelText="No">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const salaryColumns = [
    { title: 'Employee', key: 'employee', render: (_: any, r: any) => r.employee ? `${r.employee.first_name} ${r.employee.last_name} (${r.employee.employee_code})` : '-' },
    { title: 'Basic', dataIndex: 'basic_salary', key: 'basic_salary', render: (v: number) => <span style={{ fontFamily: 'monospace' }}>${Number(v).toFixed(2)}</span> },
    { title: 'Gross', dataIndex: 'gross_salary', key: 'gross_salary', render: (v: number) => <span style={{ fontFamily: 'monospace' }}>${Number(v).toFixed(2)}</span> },
    { title: 'Deductions', dataIndex: 'total_deductions', key: 'total_deductions', render: (v: number) => <span style={{ fontFamily: 'monospace', color: '#ff4d4f' }}>-${Number(v).toFixed(2)}</span> },
    { title: 'Net', dataIndex: 'net_salary', key: 'net_salary', render: (v: number) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#52c41a' }}>${Number(v).toFixed(2)}</span> },
    { title: 'Effective From', dataIndex: 'effective_from', key: 'effective_from', render: (d: string) => d ? dayjs(d).format('MMM DD, YYYY') : '-' },
    { title: 'Status', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
  ];

  const tabItems = [
    {
      key: 'list',
      label: 'Employee List',
      children: (
        <div style={{ padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Input
              placeholder="Search employees..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              allowClear
              style={{ width: 260, borderRadius: 8 }}
            />
            <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }} onClick={() => handleOpenModal()}>
              Add Employee
            </Button>
          </div>
          <Table
            columns={employeeColumns}
            dataSource={filteredData}
            loading={isLoading}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
            rowClassName={(record: any) => {
              if (record.status === 'terminated') return 'row-terminated';
              if (record.status === 'on_leave') return 'row-on-leave';
              return '';
            }}
          />
        </div>
      ),
    },
    {
      key: 'salaries',
      label: 'Salary Structures',
      children: (
        <div style={{ padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button type="primary" icon={<DollarOutlined />} style={{ borderRadius: 8 }} onClick={() => setIsSalaryModalOpen(true)}>
              Setup Salary
            </Button>
          </div>
          <Table columns={salaryColumns} dataSource={salaryList} loading={salaryLoading} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <Tabs items={tabItems} />

      <Modal title={editingEmployee ? 'Edit Employee' : 'Add Employee'} open={isModalOpen} onOk={handleSubmit} onCancel={handleCloseModal} width={700} confirmLoading={createMutation.isPending || updateMutation.isPending} forceRender>
        <Form form={form} layout="vertical">
          <Form.Item name="employee_code" label="Employee Code" rules={[{ required: true }]}><Input placeholder="EMP001" /></Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item>
          </div>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}><Input /></Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="phone" label="Phone"><Input /></Form.Item>
            <Form.Item name="date_of_birth" label="Date of Birth"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </div>
          <Form.Item name="department" label="Department" rules={[{ required: true }]}>
            <Select><Select.Option value="IT">IT</Select.Option><Select.Option value="HR">HR</Select.Option><Select.Option value="Finance">Finance</Select.Option><Select.Option value="Sales">Sales</Select.Option><Select.Option value="Marketing">Marketing</Select.Option><Select.Option value="Operations">Operations</Select.Option></Select>
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="position" label="Position" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="hire_date" label="Hire Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="employment_type" label="Employment Type">
              <Select><Select.Option value="full_time">Full Time</Select.Option><Select.Option value="part_time">Part Time</Select.Option><Select.Option value="contract">Contract</Select.Option><Select.Option value="intern">Intern</Select.Option></Select>
            </Form.Item>
            <Form.Item name="status" label="Status">
              <Select><Select.Option value="active">Active</Select.Option><Select.Option value="inactive">Inactive</Select.Option><Select.Option value="on_leave">On Leave</Select.Option><Select.Option value="terminated">Terminated</Select.Option></Select>
            </Form.Item>
          </div>
          <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Setup Employee Salary" open={isSalaryModalOpen}
        onOk={async () => { const values = await salaryForm.validateFields(); createSalaryMutation.mutate({ employee_id: values.employee_id, basic_salary: values.basic_salary, effective_from: dayjs().format('YYYY-MM-DD') }); }}
        onCancel={() => { setIsSalaryModalOpen(false); salaryForm.resetFields(); }}
        confirmLoading={createSalaryMutation.isPending}
      >
        <Form form={salaryForm} layout="vertical">
          <Form.Item name="employee_id" label="Employee" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select employee" filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={employees.map((e: any) => ({ value: e.id, label: `${e.first_name} ${e.last_name} (${e.employee_code})` }))} />
          </Form.Item>
          <Form.Item name="basic_salary" label="Basic Salary" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0} precision={2} prefix="$" />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-terminated td { background: rgba(239, 68, 68, 0.12) !important; opacity: 0.82; }
        .row-on-leave td { background: rgba(245, 158, 11, 0.12) !important; }
      `}</style>
    </div>
  );
}
