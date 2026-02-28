import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Select } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

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

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/project-management/resources', data),
    onSuccess: () => {
      message.success('Resource assigned successfully');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['project-resources'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to assign resource'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/project-management/resources/${id}`, data),
    onSuccess: () => {
      message.success('Resource updated successfully');
      setIsModalVisible(false);
      setEditingRecord(null);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['project-resources'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update resource'),
  });

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
      end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
      allocation_percentage: Number(values.allocation_percentage || 0)
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    { title: 'Resource Name', dataIndex: 'resource_name', key: 'resource_name' },
    { title: 'Project', dataIndex: 'project_name', key: 'project_name' },
    { title: 'Role', dataIndex: 'role', key: 'role' },
    { title: 'Allocation %', dataIndex: 'allocation_percentage', key: 'allocation_percentage', render: (pct: number) => `${pct}%` },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date', render: (date: string) => date ? new Date(date).toLocaleDateString() : '-' },
    { title: 'End Date', dataIndex: 'end_date', key: 'end_date', render: (date: string) => date ? new Date(date).toLocaleDateString() : '-' },
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
                  start_date: record.start_date ? dayjs(record.start_date) : null,
                  end_date: record.end_date ? dayjs(record.end_date) : null
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
        <h2 className="text-xl font-semibold">Resources</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRecord(null);
            setIsModalVisible(true);
            setTimeout(() => form.resetFields(), 0);
          }}
        >
          Assign Resource
        </Button>
      </div>

      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />

      <Modal
        title={editingRecord ? 'Edit Resource' : 'Assign Resource'}
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

          <Form.Item name="resource_name" label="Resource Name" rules={[{ required: true }]}>
            <Input placeholder="Enter resource name" />
          </Form.Item>

          <Form.Item name="role" label="Role / Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Lead Developer" />
          </Form.Item>

          <Form.Item name="allocation_percentage" label="Allocation %" rules={[{ required: true }]}>
            <Input type="number" min={0} max={100} />
          </Form.Item>

          <Form.Item name="start_date" label="Start Date">
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item name="end_date" label="End Date">
            <DatePicker className="w-full" />
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
