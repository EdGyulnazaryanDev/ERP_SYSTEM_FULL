import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, DatePicker, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/api/hr';
import dayjs from 'dayjs';

export default function EmployeesTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrApi.getEmployees().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => hrApi.createEmployee(values),
    onSuccess: () => {
      message.success('Employee created successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      handleCloseModal();
    },
    onError: () => message.error('Failed to create employee'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: any) => hrApi.updateEmployee(id, values),
    onSuccess: () => {
      message.success('Employee updated successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      handleCloseModal();
    },
    onError: () => message.error('Failed to update employee'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hrApi.deleteEmployee(id),
    onSuccess: () => {
      message.success('Employee deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: () => message.error('Failed to delete employee'),
  });

  const handleOpenModal = (employee?: any) => {
    if (employee) {
      setEditingEmployee(employee);
      form.setFieldsValue({
        ...employee,
        date_of_birth: employee.date_of_birth ? dayjs(employee.date_of_birth) : null,
        hire_date: employee.hire_date ? dayjs(employee.hire_date) : null,
      });
    } else {
      setEditingEmployee(null);
      setIsModalOpen(true);
      setTimeout(() => {
        form.resetFields();
      }, 0);
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

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const filteredData = searchQuery
    ? data?.data?.filter((emp: any) =>
      `${emp.first_name} ${emp.last_name} ${emp.email} ${emp.employee_code}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
    : data?.data;

  const columns = [
    { title: 'Code', dataIndex: 'employee_code', key: 'employee_code', width: 100 },
    {
      title: 'Name',
      key: 'name',
      render: (_: any, record: any) => `${record.first_name} ${record.last_name}`,
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone_number', key: 'phone_number' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Position', dataIndex: 'position', key: 'position' },
    {
      title: 'Status',
      dataIndex: 'employment_status',
      key: 'employment_status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : status === 'INACTIVE' ? 'red' : 'orange'}>
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
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          />
          <Popconfirm
            title="Delete employee"
            description="Are you sure you want to delete this employee?"
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

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Employees</h2>
        <Space>
          <Input.Search
            placeholder="Search employees..."
            allowClear
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            Add Employee
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredData || []}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />

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
          <Form.Item
            name="employee_code"
            label="Employee Code"
            rules={[{ required: true, message: 'Please enter employee code' }]}
          >
            <Input placeholder="EMP001" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="first_name"
              label="First Name"
              rules={[{ required: true, message: 'Please enter first name' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="last_name"
              label="Last Name"
              rules={[{ required: true, message: 'Please enter last name' }]}
            >
              <Input />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter valid email' },
            ]}
          >
            <Input />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="phone_number" label="Phone Number">
              <Input />
            </Form.Item>

            <Form.Item name="date_of_birth" label="Date of Birth">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item
            name="department"
            label="Department"
            rules={[{ required: true, message: 'Please select department' }]}
          >
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
            <Form.Item
              name="position"
              label="Position"
              rules={[{ required: true, message: 'Please enter position' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item name="hire_date" label="Hire Date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="employment_type" label="Employment Type">
              <Select>
                <Select.Option value="FULL_TIME">Full Time</Select.Option>
                <Select.Option value="PART_TIME">Part Time</Select.Option>
                <Select.Option value="CONTRACT">Contract</Select.Option>
                <Select.Option value="INTERN">Intern</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="employment_status" label="Status">
              <Select>
                <Select.Option value="ACTIVE">Active</Select.Option>
                <Select.Option value="INACTIVE">Inactive</Select.Option>
                <Select.Option value="ON_LEAVE">On Leave</Select.Option>
                <Select.Option value="TERMINATED">Terminated</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
