import { useState, useMemo } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Select, Popconfirm, Tooltip, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '@/api/client';
import type { Bin, Warehouse } from './types';

type FormValues = Omit<Bin, 'id' | 'warehouse_name' | 'created_at' | 'updated_at'>;

const fetchBins = (): Promise<Bin[]> =>
  apiClient.get('/warehouse/bins/all').then((r) => {
    const d = r.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  });

const fetchWarehouses = (): Promise<Warehouse[]> =>
  apiClient.get('/warehouse').then((r) => {
    const d = r.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  });

const ZONE_COLORS: Record<string, string> = {
  'Zone A': '#1677ff', 'Zone B': '#52c41a', 'Zone C': '#fa8c16',
  'Zone D': '#722ed1', 'Zone E': '#13c2c2', 'Zone F': '#eb2f96',
};

function ZoneBadge({ zone }: { zone: string }) {
  if (!zone) return <span style={{ color: '#bfbfbf' }}>—</span>;
  const color = ZONE_COLORS[zone] || '#595959';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
      background: `${color}15`, color, border: `1px solid ${color}33`,
      fontSize: 11, fontWeight: 600,
    }}>{zone}</span>
  );
}

function LocationBadge({ label, value, color }: { label: string; value: string; color: string }) {
  if (!value) return null;
  return (
    <Tag style={{
      borderRadius: 6, fontSize: 11, padding: '1px 7px',
      background: `${color}10`, color, border: `1px solid ${color}30`,
    }}>
      <span style={{ opacity: 0.6, marginRight: 3 }}>{label}</span>{value}
    </Tag>
  );
}

export default function BinsTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Bin | null>(null);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string | undefined>();

  const { data = [], isLoading } = useQuery({ queryKey: ['bins'], queryFn: fetchBins });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: fetchWarehouses });

  const filtered = useMemo(() => {
    let list = data;
    if (warehouseFilter) list = list.filter(b => b.warehouse_id === warehouseFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        b.bin_code?.toLowerCase().includes(q) ||
        b.zone?.toLowerCase().includes(q) ||
        b.warehouse_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search, warehouseFilter]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['bins'] });
  const closeModal = () => { setIsModalOpen(false); setEditing(null); form.resetFields(); };

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
    editing ? updateMutation.mutate({ id: editing.id, payload }) : createMutation.mutate(payload);
  };

  const columns: ColumnsType<Bin> = [
    {
      title: 'Bin Code', dataIndex: 'bin_code', key: 'bin_code', width: 120,
      render: (v: string) => (
        <span style={{
          fontFamily: 'monospace', fontWeight: 700, fontSize: 12,
          background: '#f9f0ff', color: '#722ed1',
          padding: '2px 8px', borderRadius: 6, border: '1px solid #d3adf7',
        }}>{v}</span>
      ),
    },
    {
      title: 'Warehouse', dataIndex: 'warehouse_name', key: 'warehouse_name',
      render: (v: string) => <span style={{ fontWeight: 500, fontSize: 13 }}>{v || '—'}</span>,
    },
    {
      title: 'Zone', dataIndex: 'zone', key: 'zone', width: 110,
      render: (v: string) => <ZoneBadge zone={v} />,
    },
    {
      title: 'Location', key: 'location',
      render: (_: unknown, r: Bin) => (
        <Space size={4} wrap>
          <LocationBadge label="Aisle" value={r.aisle} color="#1677ff" />
          <LocationBadge label="Rack" value={r.rack} color="#fa8c16" />
          <LocationBadge label="Lvl" value={r.level} color="#52c41a" />
        </Space>
      ),
    },
    {
      title: 'Capacity', dataIndex: 'capacity', key: 'capacity', width: 100, align: 'right' as const,
      render: (v: number | null) => v
        ? <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1677ff' }}>{v.toLocaleString()}</span>
        : <span style={{ color: '#bfbfbf' }}>—</span>,
    },
    {
      title: '', key: 'actions', width: 80, align: 'center' as const,
      render: (_: unknown, record: Bin) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm title="Delete bin?" onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Delete" okButtonProps={{ danger: true }}>
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space wrap>
          <span style={{ fontWeight: 700, color: '#1a1a2e', fontSize: 14 }}>
            <AppstoreOutlined style={{ color: '#722ed1', marginRight: 6 }} />
            {filtered.length} bins
          </span>
          <Input.Search
            placeholder="Search bin code, zone…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 220 }} size="small" allowClear
          />
          <Select
            placeholder="All warehouses" allowClear size="small" style={{ width: 200 }}
            value={warehouseFilter} onChange={setWarehouseFilter}
            options={warehouses.map((w: Warehouse) => ({ label: `${w.warehouse_name} (${w.warehouse_code})`, value: w.id }))}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }}
          onClick={() => { setEditing(null); setIsModalOpen(true); form.resetFields(); }}>
          Add Bin
        </Button>
      </div>

      <Table
        columns={columns} dataSource={filtered} loading={isLoading} rowKey="id" size="small"
        pagination={{ pageSize: 15, showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}` }}
      />

      <Modal title={editing ? '✏️ Edit Bin' : '📦 Add Bin'}
        open={isModalOpen} forceRender onCancel={closeModal} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="warehouse_id" label="Warehouse" rules={[{ required: true }]}>
            <Select placeholder="Select Warehouse" showSearch optionFilterProp="children">
              {warehouses.map((w: Warehouse) => (
                <Select.Option key={w.id} value={w.id}>{w.warehouse_name} ({w.warehouse_code})</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="bin_code" label="Bin Code" rules={[{ required: true }]}>
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
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={closeModal}>Cancel</Button>
              <Button type="primary" htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
