import { useState, useMemo } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Select, Popconfirm, Tag, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, CheckOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { procurementApi } from '@/api/procurement';
import apiClient from '@/api/client';
import dayjs from 'dayjs';
import { useAccessControl } from '@/hooks/useAccessControl';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  draft:            { color: '#8c8c8c', bg: '#fafafa',   label: 'Draft' },
  pending_approval: { color: '#fa8c16', bg: '#fff7e6',   label: 'Pending' },
  pending:          { color: '#fa8c16', bg: '#fff7e6',   label: 'Pending' },
  approved:         { color: '#52c41a', bg: '#f6ffed',   label: 'Approved' },
  rejected:         { color: '#ff4d4f', bg: '#fff2f0',   label: 'Rejected' },
  cancelled:        { color: '#bfbfbf', bg: '#f5f5f5',   label: 'Cancelled' },
  received:         { color: '#1677ff', bg: '#e6f4ff',   label: 'Received' },
};

function StatusPill({ status }: { status: string }) {
  const key = (status || '').toLowerCase();
  const cfg = STATUS_CONFIG[key] || { color: '#8c8c8c', bg: '#fafafa', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      fontSize: 11, fontWeight: 600,
    }}>
      {cfg.label.toUpperCase()}
    </span>
  );
}

export default function PurchaseOrdersTab() {
  const queryClient = useQueryClient();
  const { canPerform } = useAccessControl();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const canCreatePurchaseOrders = canPerform('procurement', 'create');
  const canEditPurchaseOrders = canPerform('procurement', 'edit');

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => procurementApi.getPurchaseOrders().then(res => res.data),
  });
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => apiClient.get('/suppliers').then(res => res.data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });

  const createMutation = useMutation({
    mutationFn: (data: any) => procurementApi.createPurchaseOrder(data),
    onSuccess: () => { message.success('Purchase Order created'); setIsModalVisible(false); form.resetFields(); invalidate(); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create PO'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => procurementApi.updatePurchaseOrder(id, data),
    onSuccess: () => { message.success('Purchase Order updated'); setIsModalVisible(false); setEditingRecord(null); form.resetFields(); invalidate(); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update PO'),
  });
  const approveMutation = useMutation({
    mutationFn: (id: string) => procurementApi.approvePurchaseOrder(id, {}),
    onSuccess: () => { message.success('Purchase Order approved'); invalidate(); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to approve PO'),
  });

  const handleSubmit = (values: any) => {
    const payload = { ...values, order_date: values.order_date ? values.order_date.format('YYYY-MM-DD') : null, total_amount: Number(values.total_amount), items: values.items || [] };
    if (editingRecord) updateMutation.mutate({ id: editingRecord.id, data: payload });
    else createMutation.mutate(payload);
  };

  const rows = Array.isArray(data) ? data : (data?.data || []);
  const filtered = useMemo(() => rows.filter((r: any) => {
    const matchSearch = !searchQuery || `${r.po_number} ${r.vendor_name}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !statusFilter || (r.status || '').toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  }), [rows, searchQuery, statusFilter]);

  const vendorList = Array.isArray(vendors) ? vendors : (vendors?.data || []);

  const columns = [
    { title: 'PO Number', dataIndex: 'po_number', key: 'po_number', width: 150,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{v}</span> },
    { title: 'Vendor', dataIndex: 'vendor_name', key: 'vendor_name',
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v || '—'}</span> },
    { title: 'Order Date', dataIndex: 'order_date', key: 'order_date', width: 120,
      render: (d: string) => d ? <span style={{ fontSize: 12 }}>{dayjs(d).format('MMM DD, YYYY')}</span> : '—' },
    { title: 'Total', dataIndex: 'total_amount', key: 'total_amount', width: 120, align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>${Number(v || 0).toFixed(2)}</span> },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 130,
      render: (s: string) => <StatusPill status={s} /> },
    {
      title: 'Actions', key: 'actions', width: 140,
      render: (_: any, record: any) => {
        const isPending = ['pending_approval', 'pending', 'draft'].includes((record.status || '').toLowerCase());
        return (
          <Space size={4}>
            {canEditPurchaseOrders && (
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
                setEditingRecord(record); setIsModalVisible(true);
                setTimeout(() => form.setFieldsValue({ ...record, order_date: record.order_date ? dayjs(record.order_date) : null }), 0);
              }} />
            )}
            {canEditPurchaseOrders && isPending && (
              <Popconfirm
                title="Approve this Purchase Order?"
                description="This will mark the PO as approved."
                onConfirm={() => approveMutation.mutate(record.id)}
                okText="Approve" okButtonProps={{ type: 'primary' }}
              >
                <Button type="primary" size="small" icon={<CheckOutlined />}
                  style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: 6 }}
                  loading={approveMutation.isPending}>
                  Approve
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Input placeholder="Search PO number, vendor..." prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} allowClear style={{ width: 240, borderRadius: 8 }} />
          <Select placeholder="All statuses" allowClear style={{ width: 150 }} value={statusFilter || undefined} onChange={v => setStatusFilter(v || '')}>
            {Object.entries(STATUS_CONFIG).filter(([k]) => !['pending'].includes(k)).map(([k, v]) =>
              <Select.Option key={k} value={k}>{v.label}</Select.Option>
            )}
          </Select>
          <span style={{ color: '#8c8c8c', fontSize: 13 }}>{filtered.length} orders</span>
        </Space>
        <Space>
          <Tooltip title="Refresh">
            <Button icon={<ReloadOutlined />} size="small" onClick={invalidate} />
          </Tooltip>
          {canCreatePurchaseOrders && (
            <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }}
              onClick={() => { setEditingRecord(null); setIsModalVisible(true); setTimeout(() => form.resetFields(), 0); }}>
              Create PO
            </Button>
          )}
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 15, showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}` }}
        rowClassName={(r: any) => {
          const s = (r.status || '').toLowerCase();
          if (s === 'approved' || s === 'received') return 'row-approved';
          if (s === 'rejected' || s === 'cancelled') return 'row-rejected';
          return '';
        }}
      />

      {(canCreatePurchaseOrders || canEditPurchaseOrders) && (
        <Modal
          title={editingRecord ? 'Edit Purchase Order' : 'Create Purchase Order'}
          open={isModalVisible}
          forceRender
          onCancel={() => { setIsModalVisible(false); setEditingRecord(null); setTimeout(() => form.resetFields(), 0); }}
          footer={null}
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="vendor_id" label="Vendor">
            <Select placeholder="Select Vendor" allowClear showSearch optionFilterProp="children">
              {vendorList.map((v: any) => <Select.Option key={v.id} value={v.id}>{v.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="order_date" label="Order Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="total_amount" label="Total Amount">
            <Input type="number" step="0.01" prefix="$" />
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="pending_approval">
            <Select>
              <Select.Option value="draft">Draft</Select.Option>
              <Select.Option value="pending_approval">Pending Approval</Select.Option>
              <Select.Option value="approved">Approved</Select.Option>
              <Select.Option value="rejected">Rejected</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingRecord ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
          </Form>
        </Modal>
      )}

      <style>{`
        .row-approved td { background: #f6ffed !important; }
        .row-rejected td { background: #fff2f0 !important; opacity: 0.8; }
      `}</style>
    </div>
  );
}
