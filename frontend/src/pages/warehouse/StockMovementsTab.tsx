import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '@/api/client';
import { inventoryApi, type Inventory } from '@/api/inventory';
import dayjs from 'dayjs';
import type { StockMovement, MovementType } from './types';

interface Courier {
  id: string;
  name: string;
  code: string;
  status: string;
}

interface FormValues {
  product_id?: string;
  product_name?: string;
  courier_id?: string;
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
    .then((r) => r.data.data ?? []);

// Reuse the same inventoryApi that InventoryPage uses — returns plain array
const fetchInventory = (): Promise<Inventory[]> =>
  inventoryApi.getAll().then((r) => {
    const data = r?.data;
    return Array.isArray(data) ? data : [];
  });

const fetchCouriers = (): Promise<Courier[]> =>
  apiClient
    .get('/transportation/couriers', { params: { status: 'active' } })
    .then((r) => {
      const raw = r?.data;
      // Handle both { data: [...] } and plain array responses
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      return [];
    });

export default function StockMovementsTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<StockMovement | null>(null);
  const [filterType, setFilterType] = useState<MovementType | undefined>();
  const [movementType, setMovementType] = useState<MovementType | undefined>();

  const { data = [], isLoading } = useQuery({
    queryKey: ['stock-movements', filterType],
    queryFn: () => fetchMovements(filterType),
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
    enabled: isModalOpen,
  });

  const { data: couriers = [] } = useQuery({
    queryKey: ['couriers-active'],
    queryFn: fetchCouriers,
    enabled: isModalOpen,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-for-tx'] });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setMovementType(undefined);
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
    setMovementType(record.movement_type);
    setIsModalOpen(true);
    setTimeout(() => {
      form.setFieldsValue({
        ...record,
        movement_date: record.movement_date ? dayjs(record.movement_date) : null,
      });
    }, 0);
  };

  const handleProductSelect = (productId: string) => {
    const item = inventoryItems.find((i: Inventory) => i.id === productId);
    if (item) {
      form.setFieldsValue({ product_name: item.product_name });
    }
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
          onClick={() => { setEditing(null); setMovementType(undefined); setIsModalOpen(true); form.resetFields(); }}
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
          {/* Product selector — loads from inventory */}
          <Form.Item name="product_id" label="Product">
            <Select
              showSearch
              allowClear
              placeholder="Select product from inventory"
              optionFilterProp="label"
              onChange={handleProductSelect}
              options={inventoryItems.map((i: Inventory) => ({
                value: i.id,
                label: `${i.product_name} (${i.sku}) — stock: ${i.available_quantity}`,
              }))}
            />
          </Form.Item>
          {/* Hidden product_name auto-filled on select */}
          <Form.Item name="product_name" label="Product Name (override)" style={{ display: 'none' }}>
            <Input />
          </Form.Item>

          <Form.Item name="movement_type" label="Movement Type" rules={[{ required: true, message: 'Select a type' }]}>
            <Select
              placeholder="Select type"
              onChange={(v) => setMovementType(v as MovementType)}
            >
              <Select.Option value="RECEIPT">Receipt (Incoming)</Select.Option>
              <Select.Option value="ISSUE">Issue (Outgoing)</Select.Option>
              <Select.Option value="TRANSFER">Transfer (Internal)</Select.Option>
              <Select.Option value="ADJUSTMENT">Adjustment</Select.Option>
            </Select>
          </Form.Item>

          {/* Courier selector — only shown for RECEIPT movements */}
          {movementType === 'RECEIPT' && (
            <Form.Item name="courier_id" label="Courier (optional)">
              <Select
                showSearch
                allowClear
                placeholder="Select available courier"
                optionFilterProp="label"
                options={couriers.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.code})`,
                }))}
              />
            </Form.Item>
          )}

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
