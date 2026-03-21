import { useState, useMemo } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, CheckOutlined, StopOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { procurementApi } from '@/api/procurement';
import { hrApi } from '@/api/hr';
import dayjs from 'dayjs';
import { useAccessControl } from '@/hooks/useAccessControl';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  draft:            { color: '#8c8c8c', bg: '#fafafa',   label: 'Draft' },
  pending:          { color: '#fa8c16', bg: '#fff7e6',   label: 'Pending' },
  pending_approval: { color: '#fa8c16', bg: '#fff7e6',   label: 'Pending' },
  approved:         { color: '#52c41a', bg: '#f6ffed',   label: 'Approved' },
  rejected:         { color: '#ff4d4f', bg: '#fff2f0',   label: 'Rejected' },
  cancelled:        { color: '#bfbfbf', bg: '#f5f5f5',   label: 'Cancelled' },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  low:    { color: 'blue',    label: 'Low' },
  medium: { color: 'orange',  label: 'Medium' },
  high:   { color: 'red',     label: 'High' },
  urgent: { color: 'magenta', label: 'Urgent' },
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

export default function PurchaseRequisitionsTab() {
  const queryClient = useQueryClient();
  const { canPerform } = useAccessControl();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const canCreateRequisitions = canPerform('procurement', 'create');
  const canEditRequisitions = canPerform('procurement', 'edit');

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-requisitions'],
    queryFn: () => procurementApi.getRequisitions().then(res => res.data),
  });
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrApi.getEmployees().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => procurementApi.createRequisition(data),
    onSuccess: () => { message.success('Requisition created'); setIsModalVisible(false); setTimeout(() => form.resetFields(), 0); queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create PR'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => procurementApi.updateRequisition(id, data),
    onSuccess: () => { message.success('Requisition updated'); setIsModalVisible(false); setEditingRecord(null); setTimeout(() => form.resetFields(), 0); queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update PR'),
  });
  const approveMutation = useMutation({
    mutationFn: (id: string) => procurementApi.approveRequisition(id, {}),
    onSuccess: () => { message.success('Requisition approved — JE created & inbound shipment opened'); queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] }); queryClient.invalidateQueries({ queryKey: ['shipments'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to approve'),
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => procurementApi.rejectRequisition(id, { rejection_reason: 'Rejected by manager' }),
    onSuccess: () => { message.success('Requisition rejected'); queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to reject'),
  });

  const handleSubmit = (values: any) => {
    const payload = { ...values, request_date: values.request_date ? values.request_date.format('YYYY-MM-DD') : null, required_date: values.required_date ? values.required_date.format('YYYY-MM-DD') : null };
    if (editingRecord) updateMutation.mutate({ id: editingRecord.id, data: payload });
    else createMutation.mutate(payload);
  };

  const rows = Array.isArray(data) ? data : (data?.data || []);
  const filtered = useMemo(() => rows.filter((r: any) => {
    const matchSearch = !searchQuery || `${r.requisition_number} ${r.department} ${r.purpose}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !statusFilter || (r.status || '').toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  }), [rows, searchQuery, statusFilter]);

  const employeeList = Array.isArray(employees) ? employees : (employees?.data || []);

  const columns = [
    { title: 'Req #', dataIndex: 'requisition_number', key: 'requisition_number', width: 140,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{v}</span> },
    { title: 'Department', dataIndex: 'department', key: 'department', width: 130,
      render: (v: string) => v ? <Tag color="geekblue" style={{ fontSize: 11 }}>{v}</Tag> : '—' },
    { title: 'Purpose', dataIndex: 'purpose', key: 'purpose', ellipsis: true },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 100,
      render: (priority: string) => {
        const key = (priority || '').toLowerCase();
        const cfg = PRIORITY_CONFIG[key] || { color: 'default', label: priority };
        return priority ? <Tag color={cfg.color} style={{ fontSize: 11, fontWeight: 600 }}>{cfg.label}</Tag> : '—';
      }
    },
    { title: 'Items', key: 'items', width: 80,
      render: (_: any, r: any) => r.items?.length ? (
        <span style={{ fontWeight: 600, color: '#1677ff' }}>{r.items.length}</span>
      ) : '—'
    },
    { title: 'Est. Total', key: 'total', width: 120, align: 'right' as const,
      render: (_: any, r: any) => {
        const total = (r.items || []).reduce((s: number, i: any) => s + Number(i.total_estimated || 0), 0);
        return total > 0 ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>${total.toFixed(2)}</span> : '—';
      }
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 120,
      render: (s: string) => <StatusPill status={s} /> },
    {
      title: 'Actions', key: 'actions', width: 160,
      render: (_: any, record: any) => {
        const isPending = ['pending_approval', 'pending_approval', 'pending'].includes((record.status || '').toLowerCase());
        return (
          <Space size={4}>
            {canEditRequisitions && (
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
                setEditingRecord(record); setIsModalVisible(true);
                setTimeout(() => form.setFieldsValue({ ...record, request_date: record.request_date ? dayjs(record.request_date) : null, required_date: record.required_date ? dayjs(record.required_date) : null }), 0);
              }} />
            )}
            {canEditRequisitions && isPending && (
              <>
                <Popconfirm title="Approve this requisition?" description="This will create a JE and open an inbound shipment."
                  onConfirm={() => approveMutation.mutate(record.id)} okText="Approve" okButtonProps={{ type: 'primary' }}>
                  <Button type="primary" size="small" icon={<CheckOutlined />}
                    style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: 6 }}
                    loading={approveMutation.isPending}>
                    Approve
                  </Button>
                </Popconfirm>
                <Popconfirm title="Reject this requisition?" onConfirm={() => rejectMutation.mutate(record.id)} okText="Reject" okButtonProps={{ danger: true }}>
                  <Button danger size="small" icon={<StopOutlined />} style={{ borderRadius: 6 }}>Reject</Button>
                </Popconfirm>
              </>
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
          <Input placeholder="Search requisitions..." prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} allowClear style={{ width: 240, borderRadius: 8 }} />
          <Select placeholder="All statuses" allowClear style={{ width: 150 }} value={statusFilter || undefined} onChange={v => setStatusFilter(v || '')}>
            {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'pending_approval').map(([k, v]) =>
              <Select.Option key={k} value={k}>{v.label}</Select.Option>
            )}
          </Select>
          <span style={{ color: '#8c8c8c', fontSize: 13 }}>{filtered.length} requisitions</span>
        </Space>
        {canCreateRequisitions && (
          <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }}
            onClick={() => { setEditingRecord(null); setIsModalVisible(true); setTimeout(() => form.resetFields(), 0); }}>
            Create Requisition
          </Button>
        )}
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
          if (s === 'approved') return 'row-approved';
          if (s === 'rejected') return 'row-rejected';
          return '';
        }}
        expandable={{
          expandedRowRender: (record: any) => {
            const items = record.items ?? [];
            if (!items.length) return <p style={{ margin: 8, color: '#8c8c8c' }}>No items attached.</p>;
            return (
              <div style={{ padding: '8px 16px', background: '#fafafa', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#595959', fontSize: 12 }}>
                  📦 Items ({items.length})
                </div>
                <Table
                  size="small"
                  dataSource={items}
                  rowKey="id"
                  pagination={false}
                  style={{ background: 'white', borderRadius: 8 }}
                  columns={[
                    { title: 'Product', dataIndex: 'product_name', key: 'product_name', render: (v: string) => <span style={{ fontWeight: 500 }}>{v || '—'}</span> },
                    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true, render: (v: string) => v || '—' },
                    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 70, align: 'center' as const },
                    { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 70, render: (v: string) => v || '—' },
                    { title: 'Est. Price', dataIndex: 'estimated_price', key: 'estimated_price', width: 110, align: 'right' as const, render: (v: number) => v ? <span style={{ fontFamily: 'monospace' }}>${Number(v).toFixed(2)}</span> : '—' },
                    { title: 'Total', dataIndex: 'total_estimated', key: 'total_estimated', width: 110, align: 'right' as const, render: (v: number) => v ? <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>${Number(v).toFixed(2)}</span> : '—' },
                  ]}
                />
              </div>
            );
          },
          rowExpandable: (record: any) => (record.items?.length ?? 0) > 0,
        }}
      />

      {(canCreateRequisitions || canEditRequisitions) && (
        <Modal
          title={editingRecord ? 'Edit Purchase Requisition' : 'Create Purchase Requisition'}
          open={isModalVisible}
          forceRender
          onCancel={() => { setIsModalVisible(false); setEditingRecord(null); setTimeout(() => form.resetFields(), 0); }}
          footer={null}
        >
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="requested_by_id" label="Requested By" rules={[{ required: true }]}>
            <Select placeholder="Select Employee">
              {employeeList.map((emp: any) => (
                <Select.Option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="request_date" label="Request Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="required_date" label="Required Date">
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="priority" label="Priority" initialValue="MEDIUM" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="LOW">Low</Select.Option>
              <Select.Option value="MEDIUM">Medium</Select.Option>
              <Select.Option value="HIGH">High</Select.Option>
              <Select.Option value="URGENT">Urgent</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="DRAFT" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="DRAFT">Draft</Select.Option>
              <Select.Option value="PENDING">Pending</Select.Option>
              <Select.Option value="APPROVED">Approved</Select.Option>
              <Select.Option value="REJECTED">Rejected</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={3} />
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
      )}

      <style>{`
        .row-approved td { background: #f6ffed !important; }
        .row-rejected td { background: #fff2f0 !important; opacity: 0.8; }
      `}</style>
    </div>
  );
}
