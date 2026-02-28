import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
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
      message.success('Milestone created successfully');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['project-milestones'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create milestone'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/project-management/milestones/${id}`, data),
    onSuccess: () => {
      message.success('Milestone updated successfully');
      setIsModalVisible(false);
      setEditingRecord(null);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['project-milestones'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update milestone'),
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

  const columns = [
    { title: 'Milestone', dataIndex: 'milestone_name', key: 'milestone_name' },
    { title: 'Project', dataIndex: 'project_name', key: 'project_name' },
    { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', render: (date: string) => date ? new Date(date).toLocaleDateString() : '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'COMPLETED' ? 'green' : 'orange'}>{status}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
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
                  due_date: record.due_date ? dayjs(record.due_date) : null
                });
              }, 0);
            }}
          />
        </Space>
      ),
    }
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Milestones</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRecord(null);
            setIsModalVisible(true);
            setTimeout(() => form.resetFields(), 0);
          }}
        >
          Add Milestone
        </Button>
      </div>

      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />

      <Modal
        title={editingRecord ? 'Edit Milestone' : 'Add Milestone'}
        open={isModalVisible}
        forceRender
        onCancel={() => {
          setIsModalVisible(false);
          setEditingRecord(null);
          setTimeout(() => form.resetFields(), 0);
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="project_id" label="Project" rules={[{ required: true }]}>
            <Select placeholder="Select Project">
              {projects?.data?.map((p: any) => (
                <Select.Option key={p.id} value={p.id}>{p.project_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="milestone_name" label="Milestone Name" rules={[{ required: true }]}>
            <Input placeholder="Enter milestone name" />
          </Form.Item>

          <Form.Item name="due_date" label="Due Date">
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item name="status" label="Status" initialValue="PENDING" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="PENDING">Pending</Select.Option>
              <Select.Option value="IN_PROGRESS">In Progress</Select.Option>
              <Select.Option value="COMPLETED">Completed</Select.Option>
            </Select>
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
