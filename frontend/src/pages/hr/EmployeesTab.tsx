import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, DatePicker, Space, Popconfirm, message, Tabs, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DollarOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/api/hr';
import dayjs from 'dayjs';

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
    onSuccess: () => {
      message.success('Employee created successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      handleCloseModal();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to create employee';
      message.error(typeof msg === 'string' ? msg : msg.join(', '));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: any) => hrApi.updateEmployee(id, values),
    onSuccess: () => {
      message.success('Employee updated successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      handleCloseModal();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to update employee';
      message.error(typeof msg === 'string' ? msg : msg.join(', '));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hrApi.deleteEmployee(id),
    onSuccess: () => {
      message.success('Employee deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to delete employee';
      message.error(typeof msg === 'string' ? msg : msg.join(', '));
    },
  });

  const createSalaryMutation = useMutation({
    mutationFn: (data: any) => hrApi.createSalaryStructure(data),
    onSuccess: () => {
      message.success('Salary structure saved');
      queryClient.invalidateQueries({ queryKey: ['salaryStructures'] });
      setIsSalaryModalOpen(false);
      salaryForm.resetFields();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to save salary';
      message.error(typeof msg === 'string' ? msg : msg.join(', '));
    },
  });

  const handleOpenModal = (employee?: any) => {
    if (employee) {
      setEditingEmployee(employee);
      setIsModalOpen(true);
      setTimeout(() => {
        form.setFieldsValue({
          ...employee,
          date_of_birth: employee.date_of_birth ? dayjs(employee.date_of_birth) : null,
          hire_date: employee.hire_date ? dayjs(employee.hire_date) : null,
        });
      }, 0);
    } else {
      setEditingEmployee(null);
      setIsModalOpen(true);
      setTimeout(() => form.resetFields(), 0);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setTimeout(() => form.resetFields(), 0);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = {
        ...values,
        date_of_birth: values.date_of_birth ? values.date_of_birth.format('YYYY-MM-DD') : null,
        hire_date: values.hire_date ? values.hire_date.format('YYYY-MM-DD') : null,
      };
      if (editingEmployee) {
        updateMutation.mutate({ id: editingEmployee.id, values: formattedValues });
      } else {
        createMutation.mutate(formattedValues);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const employees: any[] = Array.isArray(data) ? data : (data?.data || []);
  const salaryList: any[] = Array.isArray(salaryData) ? salaryData : (salaryData?.data || []);

  const filteredData = searchQuery
    ? employees.filter((emp: any) =>
        `${emp.first_name} ${emp.last_name} ${emp.email} ${emp.employee_code}`
          .toLowerCase().includes(searchQuery.toLowerCase())
      )
    : employees;

  const employeeColumns = [
    { title: 'Code', dataIndex: 'employee_code', key: 'employee_code', width: 100 },
    {
      title: 'Name',
      key: 'name',
      render: (_: any, record: any) => `${record.first_name} ${record.last_name}`,
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Position', dataIndex: 'position', key: 'position' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : status === 'inactive' ? 'red' : 'orange'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
          <Popconfirm
            title="Delete employee"
            description="Are you sure?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const salaryColumns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_: any, record: any) =>
        record.employee ? `${record.employee.first_name} ${record.employee.last_name} (${record.employee.employee_code})` : '-',
    },
    {
      title: 'Basic Salary',
      dataIndex: 'basic_salary',
      key: 'basic_salary',
      render: (v: number) => `$${Number(v).toFixed(2)}`,
    },
    {
      title: 'Gross Salary',
      dataIndex: 'gross_salary',
      key: 'gross_salary',
      render: (v: number) => `$${Number(v).toFixed(2)}`,
    },
    {
      title: 'Deductions',
      dataIndex: 'total_deductions',
      key: 'total_deductions',
      render: (v: number) => `$${Number(v).toFixed(2)}`,
    },
    {
      title: 'Net Salary',
      dataIndex: 'net_salary',
      key: 'net_salary',
      render: (v: number) => <span className="font-semibold">${Number(v).toFixed(2)}</span>,
    },
    {
      title: 'Effective From',
      dataIndex: 'effective_from',
      key: 'effective_from',
      render: (d: string) => d ? dayjs(d).format('MMM DD, YYYY') : '-',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
  ];

  const tabItems = [
    {
      key: 'list',
      label: 'Employee List',
      children: (
        <>
          <div className="mb-4 flex justify-between">
            <Space>
              <Input.Search
                placeholder="Search employees..."
                allowClear
                onSearch={setSearchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: 250 }}
                prefix={<SearchOutlined />}
              />
            </Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
              Add Employee
            </Button>
          </div>
          <Table
            columns={employeeColumns}
            dataSource={filteredData}
            loading={isLoading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
    {
      key: 'salaries',
      label: 'Salary Structures',
      children: (
        <>
          <div className="mb-4 flex justify-end">
            <Button type="primary" icon={<DollarOutlined />} onClick={() => setIsSalaryModalOpen(true)}>
              Setup Salary
            </Button>
          </div>
          <Table
            columns={salaryColumns}
            dataSource={salaryList}
            loading={salaryLoading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Employees</h2>
      </div>

      <Tabs items={tabItems} />

      <Modal
        title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        width={700}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        forceRender
      >
        <Form form={form} layout="vertical">
          <Form.Item name="employee_code" label="Employee Code" rules={[{ required: true }]}>
            <Input placeholder="EMP001" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
            <Input />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="phone" label="Phone Number">
              <Input />
            </Form.Item>
            <Form.Item name="date_of_birth" label="Date of Birth">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="department" label="Department" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="IT">IT</Select.Option>
              <Select.Option value="HR">HR</Select.Option>
              <Select.Option value="Finance">Finance</Select.Option>
              <Select.Option value="Sales">Sales</Select.Option>
              <Select.Option value="Marketing">Marketing</Select.Option>
              <Select.Option value="Operations">Operations</Select.Option>
            </Select>
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="position" label="Position" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="hire_date" label="Hire Date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="employment_type" label="Employment Type">
              <Select>
                <Select.Option value="full_time">Full Time</Select.Option>
                <Select.Option value="part_time">Part Time</Select.Option>
                <Select.Option value="contract">Contract</Select.Option>
                <Select.Option value="intern">Intern</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="status" label="Status">
              <Select>
                <Select.Option value="active">Active</Select.Option>
                <Select.Option value="inactive">Inactive</Select.Option>
                <Select.Option value="on_leave">On Leave</Select.Option>
                <Select.Option value="terminated">Terminated</Select.Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Setup Employee Salary"
        open={isSalaryModalOpen}
        onOk={async () => {
          const values = await salaryForm.validateFields();
          createSalaryMutation.mutate({
            employee_id: values.employee_id,
            basic_salary: values.basic_salary,
            effective_from: dayjs().format('YYYY-MM-DD'),
          });
        }}
        onCancel={() => { setIsSalaryModalOpen(false); salaryForm.resetFields(); }}
        confirmLoading={createSalaryMutation.isPending}
      >
        <Form form={salaryForm} layout="vertical">
          <Form.Item name="employee_id" label="Employee" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select employee"
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={employees.map((e: any) => ({
                value: e.id,
                label: `${e.first_name} ${e.last_name} (${e.employee_code})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="basic_salary" label="Basic Salary" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0} precision={2} prefix="$" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

