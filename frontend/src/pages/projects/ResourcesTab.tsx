import { useState } from 'react';
import { Table, Button, Space, Modal, Form, DatePicker, message, Select, InputNumber, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

const RESOURCE_ROLES = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'developer', label: 'Developer' },
  { value: 'designer', label: 'Designer' },
  { value: 'qa', label: 'QA' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'other', label: 'Other' },
];

export default function ResourcesTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['project-resources'],
    queryFn: () => apiClient.get('/project-management/resources').then(res => res.data),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get('/project-management/projects').then(res => res.data),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiClient.get('/hr/employees').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/project-management/resources', data),
    onSuccess: () => {
      message.success('Resource assigned');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['project-resources'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to assign resource'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/project-management/resources/${id}`, data),
    onSuccess: () => {
      message.success('Resource updated');
      setIsModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['project-resources'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update resource'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/project-management/resources/${id}`),
    onSuccess: () => {
      message.success('Resource removed');
      queryClient.invalidateQueries({ queryKey: ['project-resources'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to remove resource'),
  });

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      allocation_start_date: values.allocation_start_date ? values.allocation_start_date.format('YYYY-MM-DD') : null,
      allocation_end_date: values.allocation_end_date ? values.allocation_end_date.format('YYYY-MM-DD') : null,
    };
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getEmployeeName = (id: string) => {
    const emp = (employees || []).find((e: any) => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : id;
  };

  const columns = [
    {
      title: 'Employee',
      dataIndex: 'employee_id',
      key: 'employee_id',
      render: (id: string) => getEmployeeName(id),
    },
    {
      title: 'Project',
      key: 'project',
      render: (_: any, r: any) => r.project?.project_name || '-',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (r: string) => <Tag>{r?.replace('_', ' ').toUpperCase()}</Tag>,
    },
    {
      title: 'Allocation',
      dataIndex: 'allocation_percentage',
      key: 'allocation_percentage',
      render: (v: number) => `${v}%`,
    },
    {
      title: 'Start',
      dataIndex: 'allocation_start_date',
      key: 'allocation_start_date',
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '-',
    },
    {
      title: 'End',
      dataIndex: 'allocation_end_date',
      key: 'allocation_end_date',
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingRecord(record);
              setIsModalVisible(true);
              setTimeout(() => {
                form.setFieldsValue({
                  ...record,
                  allocation_start_date: record.allocation_start_date ? dayjs(record.allocation_start_date) : null,
                  allocation_end_date: record.allocation_end_date ? dayjs(record.allocation_end_date) : null,
                });
              }, 0);
            }}
          />
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => deleteMutation.mutate(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Resources</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setEditingRecord(null); setIsModalVisible(true); form.resetFields(); }}
        >
          Assign Resource
        </Button>
      </div>

      <Table columns={columns} dataSource={data || []} loading={isLoading} rowKey="id" />

      <Modal
        title={editingRecord ? 'Edit Resource' : 'Assign Resource'}
        open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); setEditingRecord(null); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="project_id" label="Project" rules={[{ required: true }]}>
            <Select placeholder="Select project" showSearch optionFilterProp="children">
              {(projects || []).map((p: any) => (
                <Select.Option key={p.id} value={p.id}>{p.project_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="employee_id" label="Employee" rules={[{ required: true }]}>
            <Select placeholder="Select employee" showSearch optionFilterProp="children">
              {(employees || []).map((emp: any) => (
                <Select.Option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="role" label="Role" initialValue="developer">
            <Select>
              {RESOURCE_ROLES.map(r => (
                <Select.Option key={r.value} value={r.value}>{r.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="allocation_percentage" label="Allocation %" initialValue={100}>
            <InputNumber min={1} max={100} className="w-full" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="allocation_start_date" label="Start Date" rules={[{ required: true }]}>
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="allocation_end_date" label="End Date">
              <DatePicker className="w-full" />
            </Form.Item>
          </div>

          <Form.Item name="hourly_rate" label="Hourly Rate">
            <InputNumber min={0} className="w-full" prefix="$" />
          </Form.Item>

          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingRecord ? 'Update' : 'Assign'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
