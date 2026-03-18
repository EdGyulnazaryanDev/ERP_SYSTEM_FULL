import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Progress, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

export default function ProjectsTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get('/project-management/projects').then(res => res.data),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiClient.get('/hr/employees').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/project-management/projects', data),
    onSuccess: () => {
      message.success('Project created');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create project'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/project-management/projects/${id}`, data),
    onSuccess: () => {
      message.success('Project updated');
      setIsModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update project'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/project-management/projects/${id}`),
    onSuccess: () => {
      message.success('Project deleted');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to delete project'),
  });

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
      end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
      progress_percentage: Number(values.progress_percentage || 0),
      estimated_budget: values.estimated_budget ? Number(values.estimated_budget) : undefined,
    };
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const statusColor: Record<string, string> = {
    planning: 'orange',
    in_progress: 'blue',
    on_hold: 'gold',
    completed: 'green',
    cancelled: 'red',
  };

  const columns = [
    { title: 'Code', dataIndex: 'project_code', key: 'project_code', width: 120 },
    { title: 'Name', dataIndex: 'project_name', key: 'project_name' },
    {
      title: 'Progress',
      dataIndex: 'progress_percentage',
      key: 'progress_percentage',
      width: 150,
      render: (v: number) => <Progress percent={v} size="small" />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s?.replace('_', ' ').toUpperCase()}</Tag>,
    },
    {
      title: 'Start',
      dataIndex: 'start_date',
      key: 'start_date',
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '-',
    },
    {
      title: 'End',
      dataIndex: 'end_date',
      key: 'end_date',
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
                  start_date: record.start_date ? dayjs(record.start_date) : null,
                  end_date: record.end_date ? dayjs(record.end_date) : null,
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
        <h2 className="text-xl font-semibold">Projects</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRecord(null);
            setIsModalVisible(true);
            form.resetFields();
          }}
        >
          New Project
        </Button>
      </div>

      <Table columns={columns} dataSource={data || []} loading={isLoading} rowKey="id" />

      <Modal
        title={editingRecord ? 'Edit Project' : 'New Project'}
        open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); setEditingRecord(null); form.resetFields(); }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="project_code" label="Project Code">
            <Input placeholder="e.g. PRJ-001 (auto-generated if empty)" />
          </Form.Item>

          <Form.Item name="project_name" label="Project Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="project_manager_id" label="Project Manager" rules={[{ required: true }]}>
            <Select placeholder="Select manager" showSearch optionFilterProp="children">
              {(employees || []).map((emp: any) => (
                <Select.Option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="status" label="Status" initialValue="planning">
            <Select>
              <Select.Option value="planning">Planning</Select.Option>
              <Select.Option value="in_progress">In Progress</Select.Option>
              <Select.Option value="on_hold">On Hold</Select.Option>
              <Select.Option value="completed">Completed</Select.Option>
              <Select.Option value="cancelled">Cancelled</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="priority" label="Priority" initialValue="medium">
            <Select>
              <Select.Option value="low">Low</Select.Option>
              <Select.Option value="medium">Medium</Select.Option>
              <Select.Option value="high">High</Select.Option>
              <Select.Option value="critical">Critical</Select.Option>
            </Select>
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}>
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="end_date" label="End Date">
              <DatePicker className="w-full" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="estimated_budget" label="Budget">
              <Input type="number" min={0} />
            </Form.Item>
            <Form.Item name="progress_percentage" label="Progress %" initialValue={0}>
              <Input type="number" min={0} max={100} />
            </Form.Item>
          </div>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingRecord ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
