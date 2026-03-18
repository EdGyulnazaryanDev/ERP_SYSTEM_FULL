import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

export default function MilestonesTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['project-milestones'],
    queryFn: () => apiClient.get('/project-management/milestones').then(res => res.data),
  });

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get('/project-management/projects').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/project-management/milestones', data),
    onSuccess: () => {
      message.success('Milestone created');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['project-milestones'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create milestone'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/project-management/milestones/${id}`, data),
    onSuccess: () => {
      message.success('Milestone updated');
      setIsModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['project-milestones'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update milestone'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/project-management/milestones/${id}`),
    onSuccess: () => {
      message.success('Milestone deleted');
      queryClient.invalidateQueries({ queryKey: ['project-milestones'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to delete milestone'),
  });

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
    };
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const statusColor: Record<string, string> = {
    pending: 'orange',
    in_progress: 'blue',
    completed: 'green',
    delayed: 'red',
  };

  const columns = [
    { title: 'Milestone', dataIndex: 'milestone_name', key: 'milestone_name' },
    {
      title: 'Project',
      key: 'project',
      render: (_: any, r: any) => r.project?.project_name || '-',
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s?.replace('_', ' ').toUpperCase()}</Tag>,
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
        <h2 className="text-xl font-semibold">Milestones</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setEditingRecord(null); setIsModalVisible(true); form.resetFields(); }}
        >
          New Milestone
        </Button>
      </div>

      <Table columns={columns} dataSource={data || []} loading={isLoading} rowKey="id" />

      <Modal
        title={editingRecord ? 'Edit Milestone' : 'New Milestone'}
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

          <Form.Item name="milestone_name" label="Milestone Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="due_date" label="Due Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item name="status" label="Status" initialValue="pending">
            <Select>
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="in_progress">In Progress</Select.Option>
              <Select.Option value="completed">Completed</Select.Option>
              <Select.Option value="delayed">Delayed</Select.Option>
            </Select>
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
