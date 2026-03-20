import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Card, Space, Tag, Input, Select, Row, Col,
  message, Popconfirm, Alert, Badge, Modal, InputNumber, Tabs, Tooltip,
  Progress,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined,
  InboxOutlined, ReloadOutlined, ShoppingCartOutlined, CheckCircleOutlined,
  StopOutlined, DollarOutlined, DatabaseOutlined,
  EnvironmentOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { inventoryApi, type Inventory } from '@/api/inventory';
import apiClient from '@/api/client';

const { Search } = Input;

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, color, icon, active, onClick, sub,
}: {
  label: string; value: number | string; color: string; icon: React.ReactNode;
  active?: boolean; onClick?: () => void; sub?: string;
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
        height: '100%',
      }}
      styles={{ body: { padding: '14px 18px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: active ? `${color}28` : `${color}18`,
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', color, fontSize: 18, flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: '#1a1a2e' }}>{value}</div>
          <div style={{ fontSize: 12, color: active ? color : '#8c8c8c', fontWeight: active ? 600 : 400, marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

// ── Stock level pill ─────────────────────────────────────────────────────────
function StockPill({ qty, reorderLevel }: { qty: number; reorderLevel: number }) {
  const isOut = qty === 0;
  const isLow = !isOut && qty <= reorderLevel;
  const color = isOut ? '#ff4d4f' : isLow ? '#fa8c16' : '#52c41a';
  const bg = isOut ? '#fff2f0' : isLow ? '#fff7e6' : '#f6ffed';
  const icon = isOut ? <StopOutlined /> : isLow ? <WarningOutlined /> : <CheckCircleOutlined />;
  const label = isOut ? 'Out of Stock' : isLow ? `Low  ${qty}` : `${qty}`;
  return (
    <Tooltip title={`Reorder level: ${reorderLevel}`}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 20,
        background: bg, color, border: `1px solid ${color}33`,
        fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      }}>
        {icon} {label}
      </div>
    </Tooltip>
  );
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>();
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('inventory');
  const [reorderModal, setReorderModal] = useState<{
    id: string; product_name: string; reorder_quantity: number; unit_cost: number; supplier_name?: string;
  } | null>(null);
  const [reorderQty, setReorderQty] = useState<number>(50);

  const toNum = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };
  const fmt = (v: unknown) => `$${toNum(v).toFixed(2)}`;

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: items = [], isLoading, error, isError } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const r = await inventoryApi.getAll();
      return Array.isArray(r?.data) ? r.data : [];
    },
    retry: 1,
    staleTime: 0,
  });

  const { data: summary } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: async () => {
      const r = await inventoryApi.getSummary();
      return r?.data || { totalItems: 0, totalQuantity: 0, totalValue: 0, lowStockItems: 0, outOfStockItems: 0 };
    },
    staleTime: 0,
  });

  const { data: reorderAlerts = [] } = useQuery({
    queryKey: ['reorder-alerts'],
    queryFn: async () => {
      const r = await apiClient.get('/inventory/reorder/alerts');
      return r.data || [];
    },
  });

  const reorderMut = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      apiClient.post(`/inventory/${id}/trigger-reorder`, { quantity }),
    onSuccess: (res) => {
      message.success(res.data?.message || 'Reorder requisition created');
      setReorderModal(null);
      queryClient.invalidateQueries({ queryKey: ['reorder-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: () => message.error('Failed to trigger reorder'),
  });

  const handleDelete = async (id: string) => {
    try {
      await inventoryApi.delete(id);
      message.success('Item deleted');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    } catch (e: unknown) {
      message.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete');
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const safeItems = useMemo(() => Array.isArray(items) ? items : [], [items]);
  const locations = useMemo(
    () => Array.from(new Set(safeItems.map((i: Inventory) => i?.location).filter(Boolean))) as string[],
    [safeItems]
  );

  const filteredItems = useMemo(() => {
    let list = safeItems;
    if (activeStatFilter === 'outOfStock') list = list.filter(i => toNum(i.quantity) === 0);
    else if (activeStatFilter === 'lowStock') list = list.filter(i => toNum(i.quantity) > 0 && toNum(i.quantity) <= toNum(i.reorder_level));
    return list.filter((item: Inventory) => {
      const matchSearch =
        (item.product_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (item.sku || '').toLowerCase().includes(searchText.toLowerCase());
      const matchLoc = !locationFilter || item.location === locationFilter;
      return matchSearch && matchLoc;
    });
  }, [safeItems, searchText, locationFilter, activeStatFilter]);

  const toggleStatFilter = (key: string) => {
    if (activeStatFilter === key) setActiveStatFilter(null);
    else { setActiveStatFilter(key); setActiveTab('inventory'); }
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Product',
      dataIndex: 'product_name',
      key: 'product_name',
      fixed: 'left' as const,
      sorter: (a: Inventory, b: Inventory) => (a.product_name || '').localeCompare(b.product_name || ''),
      render: (text: string, record: Inventory) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{text || '—'}</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>{record.sku}</div>
        </div>
      ),
    },
    {
      title: 'Stock',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 140,
      sorter: (a: Inventory, b: Inventory) => toNum(a.quantity) - toNum(b.quantity),
      render: (qty: number, record: Inventory) => (
        <StockPill qty={toNum(qty)} reorderLevel={toNum(record.reorder_level)} />
      ),
    },
    {
      title: 'Available',
      dataIndex: 'available_quantity',
      key: 'available_quantity',
      width: 95,
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ fontWeight: 600, color: toNum(v) === 0 ? '#ff4d4f' : '#1a1a2e' }}>{toNum(v)}</span>
      ),
    },
    {
      title: 'Reserved',
      dataIndex: 'reserved_quantity',
      key: 'reserved_quantity',
      width: 90,
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ color: toNum(v) > 0 ? '#722ed1' : '#bfbfbf' }}>{toNum(v)}</span>
      ),
    },
    {
      title: 'Stock Fill',
      key: 'fill',
      width: 120,
      render: (_: unknown, record: Inventory) => {
        const qty = toNum(record.quantity);
        const max = toNum(record.max_stock_level) || 100;
        const pct = Math.min(Math.round((qty / max) * 100), 100);
        const color = qty === 0 ? '#ff4d4f' : qty <= toNum(record.reorder_level) ? '#fa8c16' : '#52c41a';
        return (
          <Tooltip title={`${qty} / ${max}`}>
            <Progress percent={pct} size="small" strokeColor={color} showInfo={false} style={{ margin: 0 }} />
          </Tooltip>
        );
      },
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      width: 120,
      render: (v: string) => v
        ? <Tag icon={<EnvironmentOutlined />} color="geekblue" style={{ fontSize: 11 }}>{v}</Tag>
        : <span style={{ color: '#bfbfbf' }}>—</span>,
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unit_cost',
      key: 'unit_cost',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{fmt(v)}</span>,
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{fmt(v)}</span>,
    },
    {
      title: 'Total Value',
      key: 'total_value',
      width: 110,
      align: 'right' as const,
      sorter: (a: Inventory, b: Inventory) => toNum(a.quantity) * toNum(a.unit_cost) - toNum(b.quantity) * toNum(b.unit_cost),
      render: (_: unknown, r: Inventory) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#722ed1', fontSize: 12 }}>
          {fmt(toNum(r.quantity) * toNum(r.unit_cost))}
        </span>
      ),
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      width: 140,
      ellipsis: true,
      render: (v: string) => v
        ? <Tag color="purple" style={{ fontSize: 11 }}>{v}</Tag>
        : <span style={{ color: '#bfbfbf', fontSize: 12 }}>—</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right' as const,
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: Inventory) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button
              type="link" size="small" icon={<EditOutlined />}
              onClick={() => navigate(`/inventory/${record.id}/edit`)}
            />
          </Tooltip>
          <Popconfirm title="Delete this item?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const reorderColumns = [
    {
      title: 'Product',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (v: string) => (
        <div style={{ fontWeight: 600 }}>{v}</div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (v: string) => {
        const isOut = v === 'out_of_stock';
        return (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 20,
            background: isOut ? '#fff2f0' : '#fff7e6',
            color: isOut ? '#ff4d4f' : '#fa8c16',
            border: `1px solid ${isOut ? '#ff4d4f33' : '#fa8c1633'}`,
            fontSize: 11, fontWeight: 600,
          }}>
            {isOut ? <StopOutlined /> : <WarningOutlined />}
            {isOut ? 'Out of Stock' : 'Low Stock'}
          </div>
        );
      },
    },
    { title: 'Available', dataIndex: 'available_quantity', key: 'available_quantity', width: 90, align: 'right' as const },
    { title: 'Reorder Level', dataIndex: 'reorder_level', key: 'reorder_level', width: 110, align: 'right' as const },
    { title: 'Default Qty', dataIndex: 'reorder_quantity', key: 'reorder_quantity', width: 100, align: 'right' as const },
    {
      title: 'Supplier',
      dataIndex: 'supplier_name',
      key: 'supplier_name',
      width: 160,
      render: (v: string) => v
        ? <Tag color="purple" style={{ fontSize: 11 }}>{v}</Tag>
        : <span style={{ color: '#bfbfbf', fontSize: 12 }}>Not assigned</span>,
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unit_cost',
      key: 'unit_cost',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: 'monospace' }}>${Number(v).toFixed(2)}</span>,
    },
    {
      title: 'Action',
      key: 'action',
      width: 130,
      render: (_: unknown, r: { id: string; product_name: string; reorder_quantity: number; unit_cost: number; supplier_name?: string }) => (
        <Button
          type="primary" size="small" icon={<ShoppingCartOutlined />}
          style={{ borderRadius: 6 }}
          onClick={() => { setReorderModal(r); setReorderQty(r.reorder_quantity || 50); }}
        >
          Order Now
        </Button>
      ),
    },
  ];

  // ── Error state ────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div style={{ padding: 24, background: '#f5f6fa', minHeight: '100vh' }}>
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: '40px 0' }}>
          <WarningOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
          <h2>Error Loading Inventory</h2>
          <p style={{ color: '#666', marginBottom: 24 }}>{(error as Error)?.message}</p>
          <Space>
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['inventory'] })}>Retry</Button>
            <Button onClick={() => navigate('/inventory/create')}>Add First Item</Button>
          </Space>
        </Card>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const alertCount = (reorderAlerts as unknown[]).length;

  return (
    <div style={{ padding: 24, background: '#f5f6fa', minHeight: '100vh' }}>

      {/* Page header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>
            <DatabaseOutlined style={{ marginRight: 10, color: '#1677ff' }} />
            Inventory
          </h1>
          <p style={{ margin: '4px 0 0', color: '#8c8c8c', fontSize: 13 }}>
            Track stock levels, valuations, and reorder alerts across all locations
          </p>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            style={{ borderRadius: 8 }}
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['inventory'] });
              queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
              queryClient.invalidateQueries({ queryKey: ['reorder-alerts'] });
            }}
          >
            Refresh
          </Button>
          <Button
            type="primary" icon={<PlusOutlined />} size="large"
            style={{ borderRadius: 8 }}
            onClick={() => navigate('/inventory/create')}
          >
            Add Item
          </Button>
        </Space>
      </div>

      {/* Stat cards */}
      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard
            label="Total Items" value={toNum(summary?.totalItems)} color="#1677ff"
            icon={<InboxOutlined />}
            active={activeStatFilter === null}
            onClick={() => setActiveStatFilter(null)}
          />
        </Col>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard
            label="Total Qty" value={toNum(summary?.totalQuantity)} color="#13c2c2"
            icon={<DatabaseOutlined />}
          />
        </Col>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard
            label="Low Stock" value={toNum(summary?.lowStockItems)} color="#fa8c16"
            icon={<WarningOutlined />}
            active={activeStatFilter === 'lowStock'}
            onClick={() => toggleStatFilter('lowStock')}
          />
        </Col>
        <Col xs={12} sm={8} md={4} lg={4}>
          <StatCard
            label="Out of Stock" value={toNum(summary?.outOfStockItems)} color="#ff4d4f"
            icon={<StopOutlined />}
            active={activeStatFilter === 'outOfStock'}
            onClick={() => toggleStatFilter('outOfStock')}
          />
        </Col>
        <Col xs={12} sm={8} md={8} lg={8}>
          <StatCard
            label="Total Stock Value" color="#722ed1"
            value={`$${toNum(summary?.totalValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<DollarOutlined />}
          />
        </Col>
      </Row>

      {/* Main card with tabs */}
      <Card
        style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        styles={{ body: { padding: 0 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ padding: '0 20px' }}
          tabBarStyle={{ marginBottom: 0 }}
          tabBarExtraContent={
            <Space style={{ paddingBottom: 8 }}>
              <Button
                icon={<ReloadOutlined />}
                size="small"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['inventory'] });
                  queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
                }}
              />
              <Button
                type="primary" size="small" icon={<PlusOutlined />}
                onClick={() => navigate('/inventory/create')}
              >
                Add Item
              </Button>
            </Space>
          }
          items={[
            {
              key: 'inventory',
              label: (
                <span>
                  <InboxOutlined style={{ marginRight: 6 }} />
                  All Items
                  {activeStatFilter && (
                    <Tag
                      color={activeStatFilter === 'outOfStock' ? 'red' : 'orange'}
                      style={{ marginLeft: 6, fontSize: 10 }}
                    >
                      {activeStatFilter === 'outOfStock' ? 'Out of Stock' : 'Low Stock'}
                    </Tag>
                  )}
                </span>
              ),
              children: (
                <div>
                  {/* Filters bar */}
                  <div style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <Row gutter={12} align="middle">
                      <Col xs={24} md={10}>
                        <Search
                          placeholder="Search by product name or SKU…"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          allowClear
                          style={{ borderRadius: 8 }}
                        />
                      </Col>
                      <Col xs={24} md={6}>
                        <Select
                          placeholder="Filter by location"
                          style={{ width: '100%' }}
                          value={locationFilter}
                          onChange={setLocationFilter}
                          allowClear
                        >
                          {locations.map((loc) => (
                            <Select.Option key={loc} value={loc}>
                              <EnvironmentOutlined style={{ marginRight: 4, color: '#1677ff' }} />{loc}
                            </Select.Option>
                          ))}
                        </Select>
                      </Col>
                      {activeStatFilter && (
                        <Col xs={24} md={4}>
                          <Button size="small" onClick={() => setActiveStatFilter(null)}>
                            Clear filter
                          </Button>
                        </Col>
                      )}
                    </Row>
                  </div>

                  {safeItems.length === 0 && !isLoading && (
                    <Alert
                      message="No inventory items yet"
                      type="info" showIcon
                      style={{ margin: '16px 0', borderRadius: 8 }}
                      action={<Button type="primary" size="small" onClick={() => navigate('/inventory/create')}>Add First Item</Button>}
                    />
                  )}

                  <Table
                    columns={columns}
                    dataSource={filteredItems}
                    rowKey="id"
                    loading={isLoading}
                    size="small"
                    scroll={{ x: 1300 }}
                    pagination={{
                      pageSize: 15,
                      showSizeChanger: true,
                      showTotal: (t, r) => `${r[0]}–${r[1]} of ${t} items`,
                      style: { padding: '12px 0' },
                    }}
                    rowClassName={(record: Inventory) => {
                      if (toNum(record.quantity) === 0) return 'row-out-of-stock';
                      if (toNum(record.quantity) <= toNum(record.reorder_level)) return 'row-low-stock';
                      return '';
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'reorder',
              label: (
                <Badge count={alertCount} offset={[6, 0]} size="small">
                  <span>
                    <ClockCircleOutlined style={{ marginRight: 6, color: alertCount > 0 ? '#fa8c16' : undefined }} />
                    Reorder Alerts
                  </span>
                </Badge>
              ),
              children: (
                <div style={{ paddingTop: 16 }}>
                  {alertCount === 0 ? (
                    <Alert
                      message="All stock levels are healthy"
                      description="No items currently need reordering."
                      type="success" showIcon
                      style={{ borderRadius: 8 }}
                      icon={<CheckCircleOutlined />}
                    />
                  ) : (
                    <Alert
                      message={`${alertCount} product(s) need reordering`}
                      description="Click 'Order Now' to set quantity and create a Purchase Requisition + draft Transaction + Journal Entry."
                      type="warning" showIcon
                      style={{ marginBottom: 16, borderRadius: 8 }}
                    />
                  )}
                  <Table
                    columns={reorderColumns}
                    dataSource={reorderAlerts as { id: string; product_name: string; reorder_quantity: number; unit_cost: number; supplier_name?: string }[]}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 20, showTotal: (t) => `${t} items need attention` }}
                    scroll={{ x: 1000 }}
                    rowClassName={() => 'row-low-stock'}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Reorder modal */}
      <Modal
        title={
          <Space>
            <ShoppingCartOutlined style={{ color: '#1677ff' }} />
            <span>Order: {reorderModal?.product_name}</span>
          </Space>
        }
        open={!!reorderModal}
        onCancel={() => setReorderModal(null)}
        onOk={() => reorderModal && reorderMut.mutate({ id: reorderModal.id, quantity: reorderQty })}
        confirmLoading={reorderMut.isPending}
        okText="Create Requisition & Transaction"
        width={480}
      >
        {reorderModal && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Supplier</div>
                <div style={{ fontWeight: 600 }}>{reorderModal.supplier_name || <span style={{ color: '#bfbfbf' }}>Not assigned</span>}</div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>Unit Cost</div>
                <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>${Number(reorderModal.unit_cost).toFixed(2)}</div>
              </Col>
            </Row>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Order Quantity</div>
            <InputNumber
              min={1}
              value={reorderQty}
              onChange={(v) => setReorderQty(v || 1)}
              style={{ width: '100%' }}
              size="large"
            />
            <div style={{
              marginTop: 16, padding: '12px 16px', borderRadius: 8,
              background: '#f6ffed', border: '1px solid #b7eb8f',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: '#52c41a', fontWeight: 500 }}>Estimated Total</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>
                ${(reorderQty * Number(reorderModal.unit_cost)).toFixed(2)}
              </span>
            </div>
            <Alert
              style={{ marginTop: 12, borderRadius: 8 }}
              type="info"
              message="This will create a Purchase Requisition (pending approval) + draft Purchase Transaction + Journal Entry (AP debit)."
              showIcon
            />
          </div>
        )}
      </Modal>

      {/* Row styles */}
      <style>{`
        .row-out-of-stock td { background: #fff2f0 !important; }
        .row-low-stock td { background: #fff7e6 !important; }
        .ant-tabs-content-holder { padding: 0 20px 20px; }
      `}</style>
    </div>
  );
}
