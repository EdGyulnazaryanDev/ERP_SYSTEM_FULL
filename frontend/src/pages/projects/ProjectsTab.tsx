import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Progress, Select } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
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
      message.success('Project created successfully');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create project'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/project-management/projects/${id}`, data),
    onSuccess: () => {
      message.success('Project updated successfully');
      setIsModalVisible(false);
      setEditingRecord(null);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update project'),
  });

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
      end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
      progress_percentage: Number(values.progress_percentage || 0)
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns = [
    { title: 'Project Code', dataIndex: 'project_code', key: 'project_code' },
    { title: 'Name', dataIndex: 'project_name', key: 'project_name' },
    { title: 'Manager', dataIndex: 'project_manager_name', key: 'project_manager_name' },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date', render: (date: string) => date ? new Date(date).toLocaleDateString() : '-' },
    { title: 'End Date', dataIndex: 'end_date', key: 'end_date', render: (date: string) => date ? new Date(date).toLocaleDateString() : '-' },
    { title: 'Progress', dataIndex: 'progress_percentage', key: 'progress_percentage', render: (progress: number) => <Progress percent={progress} size="small" /> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'COMPLETED' ? 'green' : status === 'IN_PROGRESS' ? 'blue' : 'orange'}>{status}</Tag> },
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
        <h2 className="text-xl font-semibold">Projects</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRecord(null);
            setIsModalVisible(true);
            setTimeout(() => form.resetFields(), 0);
          }}
        >
          Create Project
        </Button>
      </div>

      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />

      <Modal
        title={editingRecord ? 'Edit Project' : 'Create Project'}
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
          <Form.Item name="project_code" label="Project Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. PRJ-2024-01" />
          </Form.Item>

          <Form.Item name="project_name" label="Project Name" rules={[{ required: true }]}>
            <Input placeholder="Enter project name" />
          </Form.Item>

          <Form.Item name="project_manager_id" label="Project Manager">
            <Select placeholder="Select Manager">
              {employees?.data?.map((emp: any) => (
                <Select.Option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="start_date" label="Start Date">
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item name="end_date" label="End Date">
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item name="progress_percentage" label="Progress %" rules={[{ required: true }]}>
            <Input type="number" min={0} max={100} />
          </Form.Item>

          <Form.Item name="status" label="Status" initialValue="DRAFT" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="DRAFT">Draft</Select.Option>
              <Select.Option value="IN_PROGRESS">In Progress</Select.Option>
              <Select.Option value="ON_HOLD">On Hold</Select.Option>
              <Select.Option value="COMPLETED">Completed</Select.Option>
              <Select.Option value="CANCELLED">Cancelled</Select.Option>
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
