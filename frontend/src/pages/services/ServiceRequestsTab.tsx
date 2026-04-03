import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function ServiceRequestsTab() {
  const queryClient = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [form] = Form.useForm();
  const { data, isLoading } = useQuery({
    queryKey: ['service-requests'],
    queryFn: () => apiClient.get('/service-management/tickets').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/service-management/tickets', data),
    onSuccess: () => {
      message.success('Ticket created');
      setCreateModal(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      // Also invalidate kanban cache just in case the user navigates over there
      queryClient.invalidateQueries({ queryKey: ['tickets-kanban'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create ticket'),
  });

  const columns = [
    { title: 'Request #', dataIndex: 'request_number', key: 'request_number' },
    { title: 'Customer', dataIndex: 'customer_name', key: 'customer_name' },
    { title: 'Service Type', dataIndex: 'service_type', key: 'service_type' },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', render: (priority: string) => <Tag color={priority === 'HIGH' ? 'red' : 'blue'}>{priority}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'COMPLETED' ? 'green' : 'orange'}>{status}</Tag> },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', render: (date: string) => new Date(date).toLocaleDateString() },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Service Requests</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
          Create Request
        </Button>
      </div>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
      
      <Modal
        title="New Service Request"
        open={createModal}
        onCancel={() => { setCreateModal(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Create"
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input placeholder="Brief description of the request / issue" />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="customer_name" label="Customer Name">
            <Input />
          </Form.Item>
          <Form.Item name="customer_email" label="Customer Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="priority" label="Priority" initialValue="medium">
            <Select options={[
              { value: 'low', label: '🟢 Low' },
              { value: 'medium', label: '🟡 Medium' },
              { value: 'high', label: '🟠 High' },
              { value: 'urgent', label: '🔴 Urgent' },
              { value: 'critical', label: '🚨 Critical' },
            ]} />
          </Form.Item>
          <Form.Item name="channel" label="Channel" initialValue="web">
            <Select options={[
              { value: 'web', label: 'Web' },
              { value: 'email', label: 'Email' },
              { value: 'phone', label: 'Phone' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
