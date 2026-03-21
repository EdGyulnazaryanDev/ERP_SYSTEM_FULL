import { useState, useMemo } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Select, Popconfirm, Tooltip } from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SwapOutlined,
  ArrowDownOutlined, ArrowUpOutlined, RetweetOutlined, ToolOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '@/api/client';
import { inventoryApi, type Inventory } from '@/api/inventory';
import dayjs from 'dayjs';
import type { StockMovement, MovementType } from './types';
import { useAccessControl } from '@/hooks/useAccessControl';

interface Courier { id: string; name: string; code: string; status: string; }
interface FormValues {
  product_id?: string; product_name?: string; courier_id?: string;
  movement_type: MovementType; from_location?: string; to_location?: string;
  quantity: number; movement_date: ReturnType<typeof dayjs> | null;
  reference_document?: string; notes?: string;
}

const MOVEMENT_CFG: Record<MovementType, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  RECEIPT:    { color: '#52c41a', bg: '#f6ffed', icon: <ArrowDownOutlined />, label: 'RECEIPT' },
  ISSUE:      { color: '#ff4d4f', bg: '#fff2f0', icon: <ArrowUpOutlined />,   label: 'ISSUE' },
  TRANSFER:   { color: '#1677ff', bg: '#e6f4ff', icon: <RetweetOutlined />,   label: 'TRANSFER' },
  ADJUSTMENT: { color: '#fa8c16', bg: '#fff7e6', icon: <ToolOutlined />,      label: 'ADJUSTMENT' },
};

function MovementPill({ type }: { type: MovementType }) {
  const cfg = MOVEMENT_CFG[type] ?? { color: '#8c8c8c', bg: '#f5f5f5', icon: null, label: type };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

const fetchMovements = (type?: MovementType): Promise<StockMovement[]> =>
  apiClient.get('/warehouse/movements/all', { params: type ? { type } : {} })
    .then((r) => {
      const d = r.data;
      if (Array.isArray(d)) return d;
      if (Array.isArray(d?.data)) return d.data;
      return [];
    });

const fetchInventory = (): Promise<Inventory[]> =>
  inventoryApi.getAll().then((r) => {
    const data = r?.data;
    return Array.isArray(data) ? data : [];
  });

const fetchCouriers = (): Promise<Courier[]> =>
  apiClient.get('/transportation/couriers', { params: { status: 'active' } }).then((r) => {
    const raw = r?.data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  });

export default function StockMovementsTab() {
  const queryClient = useQueryClient();
  const { canPerform } = useAccessControl();
  const [form] = Form.useForm<FormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<StockMovement | null>(null);
  const [filterType, setFilterType] = useState<MovementType | undefined>();
  const [movementType, setMovementType] = useState<MovementType | undefined>();
  const [search, setSearch] = useState('');
  const canCreateMovements = canPerform('warehouse', 'create');
  const canEditMovements = canPerform('warehouse', 'edit');
  const canDeleteMovements = canPerform('warehouse', 'delete');

  const { data = [], isLoading } = useQuery({
    queryKey: ['stock-movements', filterType],
    queryFn: () => fetchMovements(filterType),
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory'], queryFn: fetchInventory, enabled: isModalOpen,
  });

  const { data: couriers = [] } = useQuery({
    queryKey: ['couriers-active'], queryFn: fetchCouriers, enabled: isModalOpen,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((m: StockMovement) =>
      m.product_name?.toLowerCase().includes(q) ||
      m.movement_number?.toLowerCase().includes(q) ||
      m.reference_document?.toLowerCase().includes(q)
    );
  }, [data, search]);

  // Summary counts
  const counts = useMemo(() => ({
    RECEIPT: data.filter((m: StockMovement) => m.movement_type === 'RECEIPT').length,
    ISSUE: data.filter((m: StockMovement) => m.movement_type === 'ISSUE').length,
    TRANSFER: data.filter((m: StockMovement) => m.movement_type === 'TRANSFER').length,
    ADJUSTMENT: data.filter((m: StockMovement) => m.movement_type === 'ADJUSTMENT').length,
  }), [data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-for-tx'] });
  };

  const closeModal = () => {
    setIsModalOpen(false); setEditing(null);
    setMovementType(undefined); form.resetFields();
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
    setTimeout(() => form.setFieldsValue({
      ...record,
      movement_date: record.movement_date ? dayjs(record.movement_date) : null,
    }), 0);
  };

  const handleProductSelect = (productId: string) => {
    const item = inventoryItems.find((i: Inventory) => i.id === productId);
    if (item) form.setFieldsValue({ product_name: item.product_name });
  };

  const handleSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      movement_date: values.movement_date ? values.movement_date.format('YYYY-MM-DD') : null,
      quantity: Number(values.quantity),
    };
    editing ? updateMutation.mutate({ id: editing.id, payload }) : createMutation.mutate(payload);
  };

  const columns: ColumnsType<StockMovement> = [
    {
      title: 'Movement #', dataIndex: 'movement_number', key: 'movement_number', width: 160,
      render: (v: string) => (
        <span style={{
          fontFamily: 'monospace', fontWeight: 700, fontSize: 11,
          background: '#f5f5f5', color: '#595959',
          padding: '2px 8px', borderRadius: 6,
        }}>{v}</span>
      ),
    },
    {
      title: 'Product', dataIndex: 'product_name', key: 'product_name',
      render: (v: string) => <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{v || '—'}</span>,
    },
    {
      title: 'Type', dataIndex: 'movement_type', key: 'movement_type', width: 130,
      render: (type: MovementType) => <MovementPill type={type} />,
    },
    {
      title: 'Route', key: 'route',
      render: (_: unknown, r: StockMovement) => (
        <div style={{ fontSize: 12 }}>
          {r.from_location && (
            <span style={{ color: '#ff4d4f', background: '#fff2f0', padding: '1px 6px', borderRadius: 4, marginRight: 4 }}>
              {r.from_location}
            </span>
          )}
          {r.from_location && r.to_location && <span style={{ color: '#bfbfbf', margin: '0 2px' }}>→</span>}
          {r.to_location && (
            <span style={{ color: '#52c41a', background: '#f6ffed', padding: '1px 6px', borderRadius: 4 }}>
              {r.to_location}
            </span>
          )}
          {!r.from_location && !r.to_location && <span style={{ color: '#bfbfbf' }}>—</span>}
        </div>
      ),
    },
    {
      title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'right' as const,
      render: (v: number, r: StockMovement) => {
        const cfg = MOVEMENT_CFG[r.movement_type];
        return (
          <span style={{
            fontFamily: 'monospace', fontWeight: 800, fontSize: 14,
            color: cfg?.color || '#1a1a2e',
          }}>
            {r.movement_type === 'ISSUE' ? '-' : '+'}{v}
          </span>
        );
      },
    },
    {
      title: 'Date', dataIndex: 'movement_date', key: 'movement_date', width: 120,
      render: (d: string) => d
        ? <span style={{ fontSize: 12, color: '#595959' }}>{dayjs(d).format('MMM DD, YYYY')}</span>
        : '—',
    },
    {
      title: 'Reference', dataIndex: 'reference_document', key: 'reference_document', ellipsis: true,
      render: (v: string) => v
        ? <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#1677ff' }}>{v}</span>
        : <span style={{ color: '#bfbfbf' }}>—</span>,
    },
    {
      title: '', key: 'actions', width: 80, align: 'center' as const,
      render: (_: unknown, record: StockMovement) => (
        <Space size={4}>
          {canEditMovements && (
            <Tooltip title="Edit">
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
            </Tooltip>
          )}
          {canDeleteMovements && (
            <Popconfirm title="Delete movement?" onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Delete" okButtonProps={{ danger: true }}>
              <Tooltip title="Delete">
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Type summary strip */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(Object.entries(MOVEMENT_CFG) as [MovementType, typeof MOVEMENT_CFG[MovementType]][]).map(([type, cfg]) => (
          <div
            key={type}
            onClick={() => setFilterType(filterType === type ? undefined : type)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
              background: filterType === type ? cfg.bg : '#fafafa',
              border: `1.5px solid ${filterType === type ? cfg.color : '#e8e8e8'}`,
              color: filterType === type ? cfg.color : '#595959',
              fontWeight: filterType === type ? 700 : 400,
              fontSize: 12, transition: 'all 0.15s',
            }}
          >
            {cfg.icon}
            <span>{cfg.label}</span>
            <span style={{
              background: filterType === type ? cfg.color : '#e8e8e8',
              color: filterType === type ? '#fff' : '#595959',
              borderRadius: 10, padding: '0 6px', fontSize: 11, fontWeight: 700,
            }}>{counts[type]}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <SwapOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
          <span style={{ fontWeight: 700, color: '#1a1a2e', fontSize: 14 }}>{filtered.length} movements</span>
          <Input.Search
            placeholder="Search product, ref…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 240 }} size="small" allowClear
          />
        </Space>
        {canCreateMovements && (
          <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }}
            onClick={() => { setEditing(null); setMovementType(undefined); setIsModalOpen(true); form.resetFields(); }}>
            Record Movement
          </Button>
        )}
      </div>

      <Table
        columns={columns} dataSource={filtered} loading={isLoading} rowKey="id" size="small"
        scroll={{ x: 1000 }}
        pagination={{ pageSize: 15, showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}` }}
        rowClassName={(r: StockMovement) => {
          if (r.movement_type === 'RECEIPT') return 'row-receipt';
          if (r.movement_type === 'ISSUE') return 'row-issue';
          return '';
        }}
      />

      {(canCreateMovements || canEditMovements) && (
        <Modal title={editing ? '✏️ Edit Movement' : '📦 Record Movement'}
          open={isModalOpen} forceRender onCancel={closeModal} footer={null}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="product_id" label="Product">
            <Select showSearch allowClear placeholder="Select product from inventory"
              optionFilterProp="label" onChange={handleProductSelect}
              options={inventoryItems.map((i: Inventory) => ({
                value: i.id,
                label: `${i.product_name} (${i.sku}) — stock: ${i.available_quantity}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="product_name" label="Product Name (override)" style={{ display: 'none' }}>
            <Input />
          </Form.Item>
          <Form.Item name="movement_type" label="Movement Type" rules={[{ required: true }]}>
            <Select placeholder="Select type" onChange={(v) => setMovementType(v as MovementType)}>
              <Select.Option value="RECEIPT">📥 Receipt (Incoming)</Select.Option>
              <Select.Option value="ISSUE">📤 Issue (Outgoing)</Select.Option>
              <Select.Option value="TRANSFER">🔄 Transfer (Internal)</Select.Option>
              <Select.Option value="ADJUSTMENT">🔧 Adjustment</Select.Option>
            </Select>
          </Form.Item>
          {(movementType === 'RECEIPT' || movementType === 'TRANSFER') && (
            <Form.Item name="courier_id" label={`Courier${movementType === 'TRANSFER' ? '' : ' (optional)'}`}
              rules={movementType === 'TRANSFER' ? [{ required: true, message: 'Select a courier for transfer' }] : []}>
              <Select
                showSearch allowClear placeholder="Select courier"
                optionFilterProp="label"
                options={couriers.map((c: Courier) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
              />
            </Form.Item>
          )}
          <Form.Item name="from_location" label="From Location">
            <Input placeholder="Source location" />
          </Form.Item>
          <Form.Item name="to_location" label="To Location">
            <Input placeholder="Destination location" />
          </Form.Item>
          <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
            <Input type="number" min={1} placeholder="Movement quantity" />
          </Form.Item>
          <Form.Item name="movement_date" label="Movement Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reference_document" label="Reference Document">
            <Input placeholder="e.g. PO-1234 or SO-999" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional notes" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={closeModal}>Cancel</Button>
              <Button type="primary" htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Update' : 'Record'}
              </Button>
            </Space>
          </Form.Item>
          </Form>
        </Modal>
      )}

      <style>{`
        .row-receipt td { background: #f6ffed !important; }
        .row-issue td { background: #fff2f0 !important; }
      `}</style>
    </div>
  );
}
