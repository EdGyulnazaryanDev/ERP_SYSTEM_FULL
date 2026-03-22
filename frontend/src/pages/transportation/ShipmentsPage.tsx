import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Card, Space, Tag, Input, Select,
  DatePicker, Row, Col, Modal, Form, message, Alert,
  Dropdown, Badge, Tooltip,
} from 'antd';
import {
  PlusOutlined, EyeOutlined, EnvironmentOutlined,
  CheckCircleOutlined, CloseCircleOutlined, CarOutlined,
  MoreOutlined, SendOutlined, ClockCircleOutlined,
  TruckOutlined, InboxOutlined, StopOutlined,
} from '@ant-design/icons';
import { transportationApi, ShipmentStatus, type Shipment } from '@/api/transportation';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

const { Search } = Input;
const { RangePicker } = DatePicker;

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ShipmentStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  [ShipmentStatus.PENDING]:           { color: '#8fa3b8', bg: 'rgba(255,255,255,0.04)', icon: <ClockCircleOutlined />, label: 'Pending' },
  [ShipmentStatus.PICKED_UP]:         { color: '#1677ff', bg: '#e6f4ff',   icon: <SendOutlined />,        label: 'Picked Up' },
  [ShipmentStatus.IN_TRANSIT]:        { color: '#13c2c2', bg: '#e6fffb',   icon: <TruckOutlined />,       label: 'In Transit' },
  [ShipmentStatus.OUT_FOR_DELIVERY]:  { color: '#722ed1', bg: '#f9f0ff',   icon: <EnvironmentOutlined />, label: 'Out for Delivery' },
  [ShipmentStatus.DELIVERED]:         { color: '#52c41a', bg: '#f6ffed',   icon: <CheckCircleOutlined />, label: 'Delivered' },
  [ShipmentStatus.FAILED]:            { color: '#ff4d4f', bg: '#fff2f0',   icon: <CloseCircleOutlined />, label: 'Failed' },
  [ShipmentStatus.RETURNED]:          { color: '#fa8c16', bg: '#fff7e6',   icon: <InboxOutlined />,       label: 'Returned' },
  [ShipmentStatus.CANCELLED]:         { color: '#9db0c4', bg: 'rgba(255,255,255,0.03)', icon: <StopOutlined />, label: 'Cancelled' },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  urgent: { color: 'red',    label: 'URGENT' },
  high:   { color: 'orange', label: 'HIGH' },
  normal: { color: 'blue',   label: 'NORMAL' },
  low:    { color: 'default', label: 'LOW' },
};

const nextStatuses: Partial<Record<ShipmentStatus, { label: string; status: ShipmentStatus; color: string }[]>> = {
  [ShipmentStatus.PENDING]: [
    { label: 'Pick Up', status: ShipmentStatus.PICKED_UP, color: 'blue' },
    { label: 'Cancel',  status: ShipmentStatus.CANCELLED, color: 'red' },
  ],
  [ShipmentStatus.PICKED_UP]: [
    { label: 'In Transit', status: ShipmentStatus.IN_TRANSIT, color: 'cyan' },
    { label: 'Cancel',     status: ShipmentStatus.CANCELLED,  color: 'red' },
  ],
  [ShipmentStatus.IN_TRANSIT]: [
    { label: 'Out for Delivery', status: ShipmentStatus.OUT_FOR_DELIVERY, color: 'purple' },
    { label: 'Failed',           status: ShipmentStatus.FAILED,           color: 'red' },
  ],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [
    { label: 'Mark Delivered', status: ShipmentStatus.DELIVERED, color: 'green' },
    { label: 'Failed',         status: ShipmentStatus.FAILED,    color: 'red' },
  ],
  [ShipmentStatus.FAILED]: [
    { label: 'Return', status: ShipmentStatus.RETURNED, color: 'orange' },
  ],
};

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, color, icon, active, onClick,
}: {
  label: string; value: number; color: string; icon: React.ReactNode;
  active?: boolean; onClick?: () => void;
}) {
  return (
    <Card
      size="small"
      onClick={onClick}
      style={{
        borderRadius: 12,
        border: active ? `2px solid ${color}` : `1px solid ${color}22`,
        background: active ? `${color}14` : `${color}08`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s ease',
        boxShadow: active ? `0 0 0 3px ${color}22` : undefined,
        transform: active ? 'translateY(-1px)' : undefined,
      }}
      bodyStyle={{ padding: '14px 18px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: active ? `${color}28` : `${color}18`,
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', color, fontSize: 16,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, color: 'var(--app-text)' }}>{value}</div>
          <div style={{ fontSize: 12, color: active ? color : 'var(--app-text-muted)', fontWeight: active ? 600 : 400, marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </Card>
  );
}

export default function ShipmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus>();
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [statusModal, setStatusModal] = useState<{
    shipment: Shipment;
    next: { label: string; status: ShipmentStatus; color: string };
  } | null>(null);
  const [form] = Form.useForm();

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments', statusFilter, dateRange],
    queryFn: async () => {
      const response = await transportationApi.getShipments({
        status: statusFilter,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
      });
      return response.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes, location }: {
      id: string; status: ShipmentStatus; notes?: string; location?: string;
    }) => apiClient.put(`/transportation/shipments/${id}/status`, { status, notes, location }),
    onSuccess: (_, vars) => {
      const msg = vars.status === ShipmentStatus.DELIVERED
        ? 'Delivered — inventory updated & JE created'
        : 'Status updated';
      message.success(msg);
      setStatusModal(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      message.error(e?.response?.data?.message || 'Failed to update status'),
  });

  const handleStatusSubmit = (values: { notes?: string; location?: string }) => {
    if (!statusModal) return;
    statusMutation.mutate({ id: statusModal.shipment.id, status: statusModal.next.status, ...values });
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const all = shipments as Shipment[];
    return {
      total:      all.length,
      inTransit:  all.filter(s => s.status === ShipmentStatus.IN_TRANSIT || s.status === ShipmentStatus.OUT_FOR_DELIVERY).length,
      pending:    all.filter(s => s.status === ShipmentStatus.PENDING || s.status === ShipmentStatus.PICKED_UP).length,
      delivered:  all.filter(s => s.status === ShipmentStatus.DELIVERED).length,
      failed:     all.filter(s => s.status === ShipmentStatus.FAILED || s.status === ShipmentStatus.CANCELLED).length,
    };
  }, [shipments]);

  const toggleStatFilter = (key: string, statuses: ShipmentStatus[]) => {
    if (activeStatFilter === key) {
      // clicking active card clears the filter
      setActiveStatFilter(null);
      setStatusFilter(undefined);
    } else {
      setActiveStatFilter(key);
      // for multi-status groups we clear the dropdown filter and handle in filteredShipments
      setStatusFilter(statuses.length === 1 ? statuses[0] : undefined);
    }
  };

  // Stat filter groups
  const STAT_FILTERS: Record<string, ShipmentStatus[]> = {
    pending:   [ShipmentStatus.PENDING, ShipmentStatus.PICKED_UP],
    inTransit: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY],
    delivered: [ShipmentStatus.DELIVERED],
    failed:    [ShipmentStatus.FAILED, ShipmentStatus.CANCELLED],
  };

  const filteredShipments = (shipments as Shipment[]).filter((s) => {
    const matchesSearch =
      s.tracking_number.toLowerCase().includes(searchText.toLowerCase()) ||
      s.destination_name.toLowerCase().includes(searchText.toLowerCase()) ||
      s.origin_name.toLowerCase().includes(searchText.toLowerCase());

    const matchesStatus = activeStatFilter
      ? STAT_FILTERS[activeStatFilter]?.includes(s.status)
      : statusFilter
        ? s.status === statusFilter
        : true;

    return matchesSearch && matchesStatus;
  });

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Tracking #',
      dataIndex: 'tracking_number',
      key: 'tracking_number',
      width: 195,
      fixed: 'left' as const,
      render: (v: string, record: Shipment) => (
        <div>
          <Button
            type="link"
            style={{ padding: 0, fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}
            onClick={() => navigate(`/transportation/shipments/${record.id}`)}
          >
            {v}
          </Button>
          {(record.origin_name?.toLowerCase().includes('supplier') || v?.startsWith('SHP-REQ')) && (
            <div><Tag color="blue" style={{ fontSize: 10, marginTop: 2 }}>INBOUND</Tag></div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 155,
      render: (s: ShipmentStatus) => {
        const cfg = STATUS_CONFIG[s] ?? { color: '#8fa3b8', bg: 'rgba(255,255,255,0.04)', icon: null, label: s };
        return (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 20,
            background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.color}33`,
            fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            {cfg.icon}
            {cfg.label.toUpperCase()}
          </div>
        );
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (p: string) => {
        const cfg = PRIORITY_CONFIG[p?.toLowerCase()] ?? { color: 'default', label: (p || '').toUpperCase() };
        return <Tag color={cfg.color} style={{ fontSize: 11, fontWeight: 600 }}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Route',
      key: 'route',
      width: 200,
      render: (_: unknown, record: Shipment) => (
        <div style={{ fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--app-text-muted)' }}>
            <SendOutlined style={{ fontSize: 10, color: '#1677ff' }} />
            <Tooltip title={record.origin_address}>
              <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                {record.origin_name}
              </span>
            </Tooltip>
          </div>
          <div style={{ borderLeft: '1px dashed #d9d9d9', marginLeft: 5, height: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--app-text-muted)' }}>
            <EnvironmentOutlined style={{ fontSize: 10, color: '#52c41a' }} />
            <Tooltip title={record.destination_address}>
              <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                {record.destination_name}
              </span>
            </Tooltip>
          </div>
        </div>
      ),
    },
    {
      title: 'Courier',
      dataIndex: ['courier', 'name'],
      key: 'courier',
      width: 110,
      ellipsis: true,
      render: (name: string) => name
        ? <Tag icon={<TruckOutlined />} color="geekblue" style={{ fontSize: 11 }}>{name}</Tag>
        : <span style={{ color: 'var(--app-text-soft)', fontSize: 12 }}>Unassigned</span>,
    },
    {
      title: 'Est. Delivery',
      dataIndex: 'estimated_delivery_date',
      key: 'estimated_delivery_date',
      width: 120,
      render: (d: string, record: Shipment) => {
        if (!d) return <span style={{ color: 'var(--app-text-soft)' }}>—</span>;
        const date = dayjs(d);
        const isLate = record.status !== ShipmentStatus.DELIVERED && date.isBefore(dayjs());
        return (
          <span style={{ color: isLate ? '#ff4d4f' : 'var(--app-text-muted)', fontWeight: isLate ? 600 : 400, fontSize: 12 }}>
            {isLate && '⚠ '}{date.format('MMM DD, YYYY')}
          </span>
        );
      },
    },
    {
      title: 'Items',
      key: 'items',
      width: 60,
      align: 'center' as const,
      render: (_: unknown, record: Shipment) => {
        const count = record.items?.length ?? 0;
        return count > 0
          ? <Badge count={count} color="#1677ff" style={{ fontSize: 11 }} />
          : <span style={{ color: 'var(--app-text-soft)' }}>—</span>;
      },
    },
    {
      title: 'Total Cost',
      dataIndex: 'total_cost',
      key: 'total_cost',
      width: 105,
      align: 'right' as const,
      render: (c: number) => (
        <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>
          {c != null ? `$${Number(c).toFixed(2)}` : '—'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 210,
      fixed: 'right' as const,
      render: (_: unknown, record: Shipment) => {
        const transitions = nextStatuses[record.status] ?? [];
        const menuItems = [
          {
            key: 'view',
            label: 'View Details',
            icon: <EyeOutlined />,
            onClick: () => navigate(`/transportation/shipments/${record.id}`),
          },
          {
            key: 'track',
            label: 'Track Shipment',
            icon: <EnvironmentOutlined />,
            onClick: () => window.open(`/track/${record.tracking_number}`, '_blank'),
          },
        ];
        return (
          <Space size={4}>
            <Dropdown menu={{ items: menuItems }} trigger={['click']}>
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
            {transitions.map((t) => (
              <Button
                key={t.status}
                size="small"
                type="primary"
                danger={t.color === 'red'}
                icon={
                  t.status === ShipmentStatus.DELIVERED ? <CheckCircleOutlined /> :
                  t.status === ShipmentStatus.CANCELLED || t.status === ShipmentStatus.FAILED ? <CloseCircleOutlined /> :
                  <CarOutlined />
                }
                style={t.color === 'green' ? { background: '#52c41a', borderColor: '#52c41a' } : undefined}
                onClick={() => { setStatusModal({ shipment: record, next: t }); form.resetFields(); }}
              >
                {t.label}
              </Button>
            ))}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--app-text)' }}>
            <TruckOutlined style={{ marginRight: 10, color: '#1677ff' }} />
            Shipments
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--app-text-muted)', fontSize: 13 }}>
            Track and manage all inbound & outbound shipments
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          style={{ borderRadius: 8 }}
          onClick={() => navigate('/transportation/shipments/create')}
        >
          Create Shipment
        </Button>
      </div>

      {/* ── Stats row ── */}
      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard label="Total" value={stats.total} color="#1677ff" icon={<InboxOutlined />}
            active={activeStatFilter === null && !statusFilter}
            onClick={() => { setActiveStatFilter(null); setStatusFilter(undefined); }}
          />
        </Col>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard label="Pending" value={stats.pending} color="#8c8c8c" icon={<ClockCircleOutlined />}
            active={activeStatFilter === 'pending'}
            onClick={() => toggleStatFilter('pending', STAT_FILTERS.pending)}
          />
        </Col>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard label="In Transit" value={stats.inTransit} color="#13c2c2" icon={<TruckOutlined />}
            active={activeStatFilter === 'inTransit'}
            onClick={() => toggleStatFilter('inTransit', STAT_FILTERS.inTransit)}
          />
        </Col>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard label="Delivered" value={stats.delivered} color="#52c41a" icon={<CheckCircleOutlined />}
            active={activeStatFilter === 'delivered'}
            onClick={() => toggleStatFilter('delivered', STAT_FILTERS.delivered)}
          />
        </Col>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard label="Failed / Cancelled" value={stats.failed} color="#ff4d4f" icon={<CloseCircleOutlined />}
            active={activeStatFilter === 'failed'}
            onClick={() => toggleStatFilter('failed', STAT_FILTERS.failed)}
          />
        </Col>
      </Row>

      {/* ── Main table card ── */}
      <Card
        style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        bodyStyle={{ padding: 0 }}
      >
        {/* Filters bar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <Row gutter={12} align="middle">
            <Col xs={24} md={9}>
              <Search
                placeholder="Search tracking #, origin, destination…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ borderRadius: 8 }}
              />
            </Col>
            <Col xs={24} md={7}>
              <Select
                placeholder="Filter by status"
                style={{ width: '100%' }}
                value={activeStatFilter ? undefined : statusFilter}
                onChange={(v) => { setStatusFilter(v); setActiveStatFilter(null); }}
                allowClear
                onClear={() => { setStatusFilter(undefined); setActiveStatFilter(null); }}
              >
                {Object.values(ShipmentStatus).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <Select.Option key={s} value={s}>
                      <span style={{ color: cfg.color }}>{cfg.icon}</span>
                      {' '}{cfg.label}
                    </Select.Option>
                  );
                })}
              </Select>
            </Col>
            <Col xs={24} md={8}>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(d) => setDateRange(d as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              />
            </Col>
          </Row>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={filteredShipments}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1350 }}
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (t, r) => `${r[0]}–${r[1]} of ${t} shipments`,
            style: { padding: '12px 20px' },
          }}
          rowClassName={(record: Shipment) => {
            if (record.status === ShipmentStatus.DELIVERED) return 'row-delivered';
            if (record.status === ShipmentStatus.FAILED || record.status === ShipmentStatus.CANCELLED) return 'row-failed';
            return '';
          }}
          expandable={{
            expandedRowRender: (record: Shipment) => {
              const items = record.items ?? [];
              if (!items.length) return <p style={{ margin: 8, color: 'var(--app-text-muted)' }}>No items attached to this shipment.</p>;
              return (
                <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(134, 166, 197, 0.12)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--app-text-muted)', fontSize: 12 }}>
                    📦 Shipment Items ({items.length})
                  </div>
                  <Table
                    size="small"
                    dataSource={items}
                    rowKey="id"
                    pagination={false}
                    style={{ background: 'white', borderRadius: 8 }}
                    columns={[
                      {
                        title: 'Product',
                        dataIndex: 'product_name',
                        key: 'product_name',
                        render: (v: string) => <span style={{ fontWeight: 500 }}>{v || '—'}</span>,
                      },
                      {
                        title: 'SKU',
                        dataIndex: 'sku',
                        key: 'sku',
                        width: 130,
                        render: (v: string) => v
                          ? <Tag style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</Tag>
                          : '—',
                      },
                      {
                        title: 'Qty',
                        dataIndex: 'quantity',
                        key: 'quantity',
                        width: 70,
                        align: 'center' as const,
                        render: (v: number) => <Badge count={v} color="#1677ff" showZero />,
                      },
                      {
                        title: 'Description',
                        dataIndex: 'description',
                        key: 'description',
                        ellipsis: true,
                        render: (v: string) => <span style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>{v || '—'}</span>,
                      },
                    ]}
                  />
                </div>
              );
            },
            rowExpandable: (record: Shipment) => (record.items?.length ?? 0) > 0,
            expandRowByClick: false,
          }}
        />
      </Card>

      {/* ── Status update modal ── */}
      <Modal
        title={
          statusModal ? (
            <Space>
              {STATUS_CONFIG[statusModal.next.status as ShipmentStatus]?.icon}
              <span>{statusModal.next.label}</span>
              <Tag style={{ fontFamily: 'monospace', fontSize: 11 }}>{statusModal.shipment.tracking_number}</Tag>
            </Space>
          ) : ''
        }
        open={!!statusModal}
        onCancel={() => { setStatusModal(null); form.resetFields(); }}
        footer={null}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleStatusSubmit}>
          {statusModal?.next.status === ShipmentStatus.DELIVERED &&
            (statusModal.shipment.origin_name?.toLowerCase().includes('supplier') ||
             statusModal.shipment.tracking_number?.startsWith('SHP-REQ')) && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16, borderRadius: 8 }}
              message="Inbound shipment — marking as delivered will:"
              description={
                <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                  <li>Update inventory quantities for all items</li>
                  <li>Create Journal Entry: Debit Inventory / Credit AP</li>
                  <li>Record goods receipt in accounting</li>
                </ul>
              }
            />
          )}
          <Form.Item name="location" label="Current Location">
            <Input placeholder="e.g. Yerevan Hub" prefix={<EnvironmentOutlined style={{ color: 'var(--app-text-soft)' }} />} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Optional notes about this status update…" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => { setStatusModal(null); form.resetFields(); }}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={statusMutation.isPending}
                danger={statusModal?.next.status === ShipmentStatus.CANCELLED || statusModal?.next.status === ShipmentStatus.FAILED}
                icon={STATUS_CONFIG[statusModal?.next.status as ShipmentStatus]?.icon}
                style={statusModal?.next.color === 'green' ? { background: '#52c41a', borderColor: '#52c41a' } : undefined}
              >
                Confirm: {statusModal?.next.label}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Row highlight styles */}
      <style>{`
        .row-delivered td { background: #f6ffed !important; }
        .row-failed td { background: #fff2f0 !important; opacity: 0.75; }
        .ant-table-row:hover .row-delivered td,
        .ant-table-row:hover .row-failed td { filter: brightness(0.97); }
      `}</style>
    </div>
  );
}
