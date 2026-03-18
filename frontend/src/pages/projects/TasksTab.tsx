import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

export default function TasksTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['project-tasks'],
    queryFn: () => apiClient.get('/project-management/tasks').then(res => res.data),
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
    mutationFn: (data: any) => apiClient.post('/project-management/tasks', data),
    onSuccess: () => {
      message.success('Task created');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create task'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/project-management/tasks/${id}`, data),
    onSuccess: () => {
      message.success('Task updated');
      setIsModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update task'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/project-management/tasks/${id}`),
    onSuccess: () => {
      message.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to delete task'),
  });

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : undefined,
      due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined,
      estimated_hours: values.estimated_hours ? Number(values.estimated_hours) : undefined,
    };
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const statusColor: Record<string, string> = {
    todo: 'default',
    in_progress: 'blue',
    in_review: 'purple',
    completed: 'green',
    blocked: 'red',
    cancelled: 'gray',
  };

  const priorityColor: Record<string, string> = {
    low: 'blue',
    medium: 'orange',
    high: 'red',
    urgent: 'magenta',
  };

  const columns = [
    { title: 'Task', dataIndex: 'task_name', key: 'task_name' },
    {
      title: 'Project',
      key: 'project',
      render: (_: any, r: any) => r.project?.project_name || '-',
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (p: string) => <Tag color={priorityColor[p] || 'default'}>{p?.toUpperCase()}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s?.replace('_', ' ').toUpperCase()}</Tag>,
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
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
                  due_date: record.due_date ? dayjs(record.due_date) : null,
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
        <h2 className="text-xl font-semibold">Tasks</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setEditingRecord(null); setIsModalVisible(true); form.resetFields(); }}
        >
          New Task
        </Button>
      </div>

      <Table columns={columns} dataSource={data || []} loading={isLoading} rowKey="id" />

      <Modal
        title={editingRecord ? 'Edit Task' : 'New Task'}
        open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); setEditingRecord(null); form.resetFields(); }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="project_id" label="Project" rules={[{ required: true }]}>
            <Select placeholder="Select project" showSearch optionFilterProp="children">
              {(projects || []).map((p: any) => (
                <Select.Option key={p.id} value={p.id}>{p.project_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="task_name" label="Task Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="assigned_to" label="Assignee">
            <Select placeholder="Select employee" allowClear showSearch optionFilterProp="children">
              {(employees || []).map((emp: any) => (
                <Select.Option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="priority" label="Priority" initialValue="medium">
            <Select>
              <Select.Option value="low">Low</Select.Option>
              <Select.Option value="medium">Medium</Select.Option>
              <Select.Option value="high">High</Select.Option>
              <Select.Option value="urgent">Urgent</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="status" label="Status" initialValue="todo">
            <Select>
              <Select.Option value="todo">To Do</Select.Option>
              <Select.Option value="in_progress">In Progress</Select.Option>
              <Select.Option value="in_review">In Review</Select.Option>
              <Select.Option value="completed">Completed</Select.Option>
              <Select.Option value="blocked">Blocked</Select.Option>
            </Select>
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="start_date" label="Start Date">
              <DatePicker className="w-full" />
            </Form.Item>
            <Form.Item name="due_date" label="Due Date">
              <DatePicker className="w-full" />
            </Form.Item>
          </div>

          <Form.Item name="estimated_hours" label="Estimated Hours">
            <Input type="number" min={0} />
          </Form.Item>

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
