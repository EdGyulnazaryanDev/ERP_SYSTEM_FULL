import { useState, useMemo } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Switch, Popconfirm, Progress, Tooltip } from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  EnvironmentOutlined, UserOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '@/api/client';
import type { Warehouse } from './types';
import { useAccessControl } from '@/hooks/useAccessControl';

type FormValues = Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>;

const fetchWarehouses = (): Promise<Warehouse[]> =>
  apiClient.get('/warehouse').then((r) => {
    const d = r.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  });

function StatusPill({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: active ? 'rgba(82,196,26,0.14)' : 'rgba(255,255,255,0.04)',
      color: active ? '#52c41a' : 'var(--app-text-muted)',
      border: `1px solid ${active ? '#52c41a33' : 'rgba(134, 166, 197, 0.16)'}`,
      fontSize: 11, fontWeight: 600,
    }}>
      {active ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
      {active ? 'ACTIVE' : 'INACTIVE'}
    </span>
  );
}

export default function WarehousesTab() {
  const queryClient = useQueryClient();
  const { canPerform } = useAccessControl();
  const [form] = Form.useForm<FormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [search, setSearch] = useState('');
  const canCreateWarehouses = canPerform('warehouse', 'create');
  const canEditWarehouses = canPerform('warehouse', 'edit');
  const canDeleteWarehouses = canPerform('warehouse', 'delete');

  const { data = [], isLoading } = useQuery({ queryKey: ['warehouses'], queryFn: fetchWarehouses });

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(w =>
      w.warehouse_name?.toLowerCase().includes(q) ||
      w.warehouse_code?.toLowerCase().includes(q) ||
      w.location?.toLowerCase().includes(q)
    );
  }, [data, search]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['warehouses'] });

  const closeModal = () => { setIsModalOpen(false); setEditing(null); form.resetFields(); };

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
    editing ? updateMutation.mutate({ id: editing.id, payload }) : createMutation.mutate(payload);
  };

  const columns: ColumnsType<Warehouse> = [
    {
      title: 'Code', dataIndex: 'warehouse_code', key: 'warehouse_code', width: 110,
      render: (v: string) => (
        <span style={{
          fontFamily: 'monospace', fontWeight: 700, fontSize: 12,
          background: 'rgba(22,119,255,0.16)', color: '#58a6ff',
          padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(88,166,255,0.24)',
        }}>{v}</span>
      ),
    },
    {
      title: 'Warehouse', dataIndex: 'warehouse_name', key: 'warehouse_name',
      render: (v: string) => <span style={{ fontWeight: 600, color: 'var(--app-text)' }}>{v}</span>,
    },
    {
      title: 'Location', dataIndex: 'location', key: 'location', ellipsis: true,
      render: (v: string) => v ? (
        <span style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>
          <EnvironmentOutlined style={{ color: '#fa8c16', marginRight: 4 }} />{v}
        </span>
      ) : '—',
    },
    {
      title: 'Manager', dataIndex: 'manager_name', key: 'manager_name',
      render: (v: string) => v ? (
        <span style={{ fontSize: 12 }}>
          <UserOutlined style={{ color: '#722ed1', marginRight: 4 }} />{v}
        </span>
      ) : <span style={{ color: 'var(--app-text-soft)' }}>—</span>,
    },
    {
      title: 'Capacity', dataIndex: 'capacity', key: 'capacity', width: 140,
      render: (v: number | null) => v ? (
        <Tooltip title={`${v.toLocaleString()} units`}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--app-text-muted)', marginBottom: 2 }}>{v.toLocaleString()} units</div>
            <Progress percent={Math.min(100, Math.round((v / 10000) * 100))}
              size="small" strokeColor="#1677ff" showInfo={false} style={{ margin: 0 }} />
          </div>
        </Tooltip>
      ) : <span style={{ color: 'var(--app-text-soft)', fontSize: 12 }}>—</span>,
    },
    {
      title: 'Status', dataIndex: 'is_active', key: 'is_active', width: 110,
      render: (active: boolean) => <StatusPill active={active} />,
    },
    {
      title: '', key: 'actions', width: 80, align: 'center' as const,
      render: (_: unknown, record: Warehouse) => (
        <Space size={4}>
          {canEditWarehouses && (
            <Tooltip title="Edit">
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
            </Tooltip>
          )}
          {canDeleteWarehouses && (
            <Popconfirm
              title="Delete warehouse?"
              description="This will fail if the warehouse has bins."
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Delete" okButtonProps={{ danger: true }}
            >
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
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <span style={{ fontWeight: 700, color: 'var(--app-text)', fontSize: 14 }}>
            🏭 {filtered.length} warehouses
          </span>
          <Input.Search
            placeholder="Search name, code, location…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 260 }} size="small" allowClear
          />
        </Space>
        {canCreateWarehouses && (
          <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }}
            onClick={() => { setEditing(null); setIsModalOpen(true); form.resetFields(); }}>
            Add Warehouse
          </Button>
        )}
      </div>

      <Table
        columns={columns} dataSource={filtered} loading={isLoading} rowKey="id" size="small"
        pagination={{ pageSize: 15, showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}` }}
        rowClassName={(r: Warehouse) => r.is_active === false ? 'row-inactive' : ''}
      />

      {(canCreateWarehouses || canEditWarehouses) && (
        <Modal title={editing ? '✏️ Edit Warehouse' : '🏭 Add Warehouse'}
          open={isModalOpen} forceRender onCancel={closeModal} footer={null}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="warehouse_code" label="Warehouse Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. WH-01" />
          </Form.Item>
          <Form.Item name="warehouse_name" label="Warehouse Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Main Distribution Center" />
          </Form.Item>
          <Form.Item name="location" label="Location" rules={[{ required: true }]}>
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
      )}

      <style>{`
        .row-inactive td { background: rgba(255,255,255,0.02) !important; color: var(--app-text-soft); }
      `}</style>
    </div>
  );
}
