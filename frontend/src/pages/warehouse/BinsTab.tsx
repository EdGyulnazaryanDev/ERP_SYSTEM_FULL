import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '@/api/client';
import type { Bin, Warehouse } from './types';

type FormValues = Omit<Bin, 'id' | 'warehouse_name' | 'created_at' | 'updated_at'>;

const fetchBins = () =>
  apiClient.get<{ data: Bin[] }>('/warehouse/bins').then((r) => r.data.data);

const fetchWarehouses = () =>
  apiClient.get<{ data: Warehouse[] }>('/warehouse').then((r) => r.data.data);

export default function BinsTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Bin | null>(null);

  const { data = [], isLoading } = useQuery({ queryKey: ['bins'], queryFn: fetchBins });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: fetchWarehouses });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['bins'] });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const createMutation = useMutation({
    mutationFn: (payload: FormValues) => apiClient.post('/warehouse/bins', payload),
    onSuccess: () => { message.success('Bin created'); closeModal(); invalidate(); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      message.error(e?.response?.data?.message || 'Failed to create bin'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FormValues }) =>
      apiClient.put(`/warehouse/bins/${id}`, payload),
    onSuccess: () => { message.success('Bin updated'); closeModal(); invalidate(); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      message.error(e?.response?.data?.message || 'Failed to update bin'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/warehouse/bins/${id}`),
    onSuccess: () => { message.success('Bin deleted'); invalidate(); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      message.error(e?.response?.data?.message || 'Failed to delete bin'),
  });

  const openEdit = (record: Bin) => {
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

  const columns: ColumnsType<Bin> = [
    { title: 'Bin Code', dataIndex: 'bin_code', key: 'bin_code', width: 120 },
    { title: 'Warehouse', dataIndex: 'warehouse_name', key: 'warehouse_name' },
    { title: 'Zone', dataIndex: 'zone', key: 'zone' },
    { title: 'Aisle', dataIndex: 'aisle', key: 'aisle' },
    { title: 'Rack', dataIndex: 'rack', key: 'rack' },
    { title: 'Level', dataIndex: 'level', key: 'level' },
    { title: 'Capacity', dataIndex: 'capacity', key: 'capacity', width: 100 },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Bin) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Delete bin?"
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
        <h2 className="text-xl font-semibold">Bins & Locations</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setEditing(null); setIsModalOpen(true); form.resetFields(); }}
        >
          Add Bin
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
        title={editing ? 'Edit Bin' : 'Add Bin'}
        open={isModalOpen}
        forceRender
        onCancel={closeModal}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="warehouse_id" label="Warehouse" rules={[{ required: true, message: 'Select a warehouse' }]}>
            <Select placeholder="Select Warehouse" showSearch optionFilterProp="children">
              {warehouses.map((w) => (
                <Select.Option key={w.id} value={w.id}>{w.warehouse_name} ({w.warehouse_code})</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="bin_code" label="Bin Code" rules={[{ required: true, message: 'Bin code is required' }]}>
            <Input placeholder="e.g. A1-01" />
          </Form.Item>
          <Form.Item name="zone" label="Zone">
            <Input placeholder="e.g. Zone A" />
          </Form.Item>
          <Form.Item name="aisle" label="Aisle">
            <Input placeholder="e.g. Aisle 1" />
          </Form.Item>
          <Form.Item name="rack" label="Rack">
            <Input placeholder="e.g. Rack 3" />
          </Form.Item>
          <Form.Item name="level" label="Level">
            <Input placeholder="e.g. Level 2" />
          </Form.Item>
          <Form.Item name="capacity" label="Capacity">
            <Input type="number" min={0} placeholder="Bin capacity" />
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
