import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Tag, Switch, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '@/api/client';
import type { Warehouse } from './types';

type FormValues = Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>;

const fetchWarehouses = () =>
  apiClient.get<{ data: Warehouse[] }>('/warehouse').then((r) => r.data.data);

export default function WarehousesTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);

  const { data = [], isLoading } = useQuery({ queryKey: ['warehouses'], queryFn: fetchWarehouses });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['warehouses'] });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const createMutation = useMutation({
    mutationFn: (payload: FormValues) => apiClient.post('/warehouse', payload),
    onSuccess: () => { message.success('Warehouse created'); closeModal(); invalidate(); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      message.error(e?.response?.data?.message || 'Failed to create warehouse'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FormValues }) =>
      apiClient.put(`/warehouse/${id}`, payload),
    onSuccess: () => { message.success('Warehouse updated'); closeModal(); invalidate(); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      message.error(e?.response?.data?.message || 'Failed to update warehouse'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/warehouse/${id}`),
    onSuccess: () => { message.success('Warehouse deleted'); invalidate(); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      message.error(e?.response?.data?.message || 'Failed to delete warehouse'),
  });

  const openEdit = (record: Warehouse) => {
    setEditing(record);
    setIsModalOpen(true);
    setTimeout(() => form.setFieldsValue(record), 0);
  };

  const handleSubmit = (values: FormValues) => {
    const payload = { ...values, capacity: values.capacity ? Number(values.capacity) : null };
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns: ColumnsType<Warehouse> = [
    { title: 'Code', dataIndex: 'warehouse_code', key: 'warehouse_code', width: 120 },
    { title: 'Name', dataIndex: 'warehouse_name', key: 'warehouse_name' },
    { title: 'Location', dataIndex: 'location', key: 'location', ellipsis: true },
    { title: 'Manager', dataIndex: 'manager_name', key: 'manager_name' },
    { title: 'Capacity', dataIndex: 'capacity', key: 'capacity', width: 100 },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Warehouse) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Delete warehouse?"
            description="This will fail if the warehouse has bins."
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Warehouses</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setEditing(null); setIsModalOpen(true); form.resetFields(); }}
        >
          Add Warehouse
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />

      <Modal
        title={editing ? 'Edit Warehouse' : 'Add Warehouse'}
        open={isModalOpen}
        forceRender
        onCancel={closeModal}
        footer={null}
        destroyOnClose={false}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="warehouse_code" label="Warehouse Code" rules={[{ required: true, message: 'Code is required' }]}>
            <Input placeholder="e.g. WH-01" />
          </Form.Item>
          <Form.Item name="warehouse_name" label="Warehouse Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="e.g. Main Distribution Center" />
          </Form.Item>
          <Form.Item name="location" label="Location" rules={[{ required: true, message: 'Location is required' }]}>
            <Input.TextArea rows={2} placeholder="Full address/location" />
          </Form.Item>
          <Form.Item name="manager_name" label="Manager Name">
            <Input placeholder="Manager's full name" />
          </Form.Item>
          <Form.Item name="capacity" label="Capacity">
            <Input type="number" min={0} placeholder="Total storage capacity" />
          </Form.Item>
          <Form.Item name="is_active" label="Status" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={closeModal}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editing ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
