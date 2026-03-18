import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '@/api/client';
import dayjs from 'dayjs';
import type { StockMovement, MovementType } from './types';

interface FormValues {
  product_name?: string;
  movement_type: MovementType;
  from_location?: string;
  to_location?: string;
  quantity: number;
  movement_date: ReturnType<typeof dayjs> | null;
  reference_document?: string;
  notes?: string;
}

const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  RECEIPT: 'green',
  ISSUE: 'red',
  TRANSFER: 'blue',
  ADJUSTMENT: 'orange',
};

const fetchMovements = (type?: MovementType) =>
  apiClient
    .get<{ data: StockMovement[] }>('/warehouse/movements/all', { params: type ? { type } : {} })
    .then((r) => r.data.data);

export default function StockMovementsTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<StockMovement | null>(null);
  const [filterType, setFilterType] = useState<MovementType | undefined>();

  const { data = [], isLoading } = useQuery({
    queryKey: ['stock-movements', filterType],
    queryFn: () => fetchMovements(filterType),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['stock-movements'] });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.post('/warehouse/movements', payload),
    onSuccess: () => { message.success('Movement recorded'); closeModal(); invalidate(); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      message.error(e?.response?.data?.message || 'Failed to record movement'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiClient.put(`/warehouse/movements/${id}`, payload),
    onSuccess: () => { message.success('Movement updated'); closeModal(); invalidate(); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      message.error(e?.response?.data?.message || 'Failed to update movement'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/warehouse/movements/${id}`),
    onSuccess: () => { message.success('Movement deleted'); invalidate(); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      message.error(e?.response?.data?.message || 'Failed to delete movement'),
  });

  const openEdit = (record: StockMovement) => {
    setEditing(record);
    setIsModalOpen(true);
    setTimeout(() => {
      form.setFieldsValue({
        ...record,
        movement_date: record.movement_date ? dayjs(record.movement_date) : null,
      });
    }, 0);
  };

  const handleSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      movement_date: values.movement_date ? values.movement_date.format('YYYY-MM-DD') : null,
      quantity: Number(values.quantity),
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns: ColumnsType<StockMovement> = [
    { title: 'Movement #', dataIndex: 'movement_number', key: 'movement_number', width: 160 },
    { title: 'Product', dataIndex: 'product_name', key: 'product_name' },
    { title: 'From', dataIndex: 'from_location', key: 'from_location' },
    { title: 'To', dataIndex: 'to_location', key: 'to_location' },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 80 },
    {
      title: 'Type',
      dataIndex: 'movement_type',
      key: 'movement_type',
      width: 120,
      render: (type: MovementType) => (
        <Tag color={MOVEMENT_TYPE_COLORS[type]}>{type}</Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'movement_date',
      key: 'movement_date',
      width: 120,
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : '-'),
    },
    { title: 'Reference', dataIndex: 'reference_document', key: 'reference_document', ellipsis: true },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: StockMovement) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Delete movement?"
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
        <Space>
          <h2 className="text-xl font-semibold">Stock Movements</h2>
          <Select
            allowClear
            placeholder="Filter by type"
            style={{ width: 160 }}
            value={filterType}
            onChange={(v) => setFilterType(v as MovementType | undefined)}
          >
            <Select.Option value="RECEIPT">Receipt</Select.Option>
            <Select.Option value="ISSUE">Issue</Select.Option>
            <Select.Option value="TRANSFER">Transfer</Select.Option>
            <Select.Option value="ADJUSTMENT">Adjustment</Select.Option>
          </Select>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setEditing(null); setIsModalOpen(true); form.resetFields(); }}
        >
          Record Movement
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
        title={editing ? 'Edit Movement' : 'Record Movement'}
        open={isModalOpen}
        forceRender
        onCancel={closeModal}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="product_name" label="Product Name">
            <Input placeholder="Product name" />
          </Form.Item>
          <Form.Item name="movement_type" label="Movement Type" rules={[{ required: true, message: 'Select a type' }]}>
            <Select placeholder="Select type">
              <Select.Option value="RECEIPT">Receipt (Incoming)</Select.Option>
              <Select.Option value="ISSUE">Issue (Outgoing)</Select.Option>
              <Select.Option value="TRANSFER">Transfer (Internal)</Select.Option>
              <Select.Option value="ADJUSTMENT">Adjustment</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="from_location" label="From Location">
            <Input placeholder="Source location" />
          </Form.Item>
          <Form.Item name="to_location" label="To Location">
            <Input placeholder="Destination location" />
          </Form.Item>
          <Form.Item name="quantity" label="Quantity" rules={[{ required: true, message: 'Quantity is required' }]}>
            <Input type="number" min={1} placeholder="Movement quantity" />
          </Form.Item>
          <Form.Item name="movement_date" label="Movement Date" rules={[{ required: true, message: 'Date is required' }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="reference_document" label="Reference Document">
            <Input placeholder="e.g. PO-1234 or SO-999" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional notes" />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={closeModal}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editing ? 'Update' : 'Record'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
