import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Card, Space, Tag, Input, Select, Row, Col,
  message, Popconfirm, Alert, Badge, Modal, InputNumber, Tabs, Tooltip,
  Progress, Segmented,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined,
  InboxOutlined, ReloadOutlined, ShoppingCartOutlined, CheckCircleOutlined,
  StopOutlined, DollarOutlined, DatabaseOutlined,
  EnvironmentOutlined, ClockCircleOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { inventoryApi, type Inventory } from '@/api/inventory';
import apiClient from '@/api/client';
import { useAccessControl } from '@/hooks/useAccessControl';

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
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: 'var(--app-text)' }}>{value}</div>
          <div style={{ fontSize: 12, color: active ? color : 'var(--app-text-muted)', fontWeight: active ? 600 : 400, marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--app-text-soft)', marginTop: 1 }}>{sub}</div>}
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
  const { canPerform } = useAccessControl();
  const [searchText, setSearchText] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>();
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventoryLens, setInventoryLens] = useState<'all' | 'risk' | 'reserved' | 'value'>('all');
  const [tableDensity, setTableDensity] = useState<'small' | 'middle'>('small');
  const [reorderModal, setReorderModal] = useState<{
    id: string; product_name: string; reorder_quantity: number; unit_cost: number; supplier_name?: string;
  } | null>(null);
  const [reorderQty, setReorderQty] = useState<number>(50);
  const canCreateInventory = canPerform('inventory', 'create');
  const canEditInventory = canPerform('inventory', 'edit');
  const canDeleteInventory = canPerform('inventory', 'delete');
  const canExportInventory = canPerform('inventory', 'export');

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
    if (inventoryLens === 'risk') {
      list = list.filter((item) => toNum(item.quantity) === 0 || toNum(item.quantity) <= toNum(item.reorder_level));
    } else if (inventoryLens === 'reserved') {
      list = list.filter((item) => toNum(item.reserved_quantity) > 0);
    } else if (inventoryLens === 'value') {
      list = [...list].sort((a, b) => (toNum(b.quantity) * toNum(b.unit_cost)) - (toNum(a.quantity) * toNum(a.unit_cost)));
    }
    return list.filter((item: Inventory) => {
      const matchSearch =
        (item.product_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (item.sku || '').toLowerCase().includes(searchText.toLowerCase());
      const matchLoc = !locationFilter || item.location === locationFilter;
      return matchSearch && matchLoc;
    });
  }, [safeItems, searchText, locationFilter, activeStatFilter, inventoryLens]);

  const inventoryInsights = useMemo(() => {
    const totalReserved = safeItems.reduce((sum, item) => sum + toNum(item.reserved_quantity), 0);
    const inventoryValue = safeItems.reduce((sum, item) => sum + (toNum(item.quantity) * toNum(item.unit_cost)), 0);
    const availableValue = safeItems.reduce((sum, item) => sum + (toNum(item.available_quantity) * toNum(item.unit_cost)), 0);
    const highValueItem = [...safeItems]
      .sort((a, b) => (toNum(b.quantity) * toNum(b.unit_cost)) - (toNum(a.quantity) * toNum(a.unit_cost)))[0];
    return {
      totalReserved,
      blockedValue: Math.max(inventoryValue - availableValue, 0),
      availableValue,
      highValueItem,
    };
  }, [safeItems]);

  const resetWorkspace = () => {
    setSearchText('');
    setLocationFilter(undefined);
    setActiveStatFilter(null);
    setInventoryLens('all');
    setActiveTab('inventory');
  };

  const exportInventoryCsv = () => {
    const rows = filteredItems.map((item) => ({
      sku: item.sku ?? '',
      product_name: item.product_name ?? '',
      location: item.location ?? '',
      quantity: toNum(item.quantity),
      available_quantity: toNum(item.available_quantity),
      reserved_quantity: toNum(item.reserved_quantity),
      reorder_level: toNum(item.reorder_level),
      unit_cost: toNum(item.unit_cost).toFixed(2),
      unit_price: toNum(item.unit_price).toFixed(2),
      total_value: (toNum(item.quantity) * toNum(item.unit_cost)).toFixed(2),
      supplier_name: item.supplier_name ?? '',
    }));

    if (!rows.length) {
      message.warning('No inventory rows available to export');
      return;
    }

    const header = Object.keys(rows[0]);
    const csv = [
      header.join(','),
      ...rows.map((row) => header.map((key) => JSON.stringify(String(row[key as keyof typeof row] ?? ''))).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-workspace-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

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
          <div style={{ fontWeight: 600, color: 'var(--app-text)' }}>{text || '—'}</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--app-text-muted)', marginTop: 2 }}>{record.sku}</div>
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
        <span style={{ fontWeight: 600, color: toNum(v) === 0 ? '#ff4d4f' : 'var(--app-text)' }}>{toNum(v)}</span>
      ),
    },
    {
      title: 'Reserved',
      dataIndex: 'reserved_quantity',
      key: 'reserved_quantity',
      width: 90,
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ color: toNum(v) > 0 ? '#722ed1' : 'var(--app-text-soft)' }}>{toNum(v)}</span>
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
        : <span style={{ color: 'var(--app-text-soft)' }}>—</span>,
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
        : <span style={{ color: 'var(--app-text-soft)', fontSize: 12 }}>—</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right' as const,
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: Inventory) => (
        <Space size={4}>
          {canEditInventory && (
            <Tooltip title="Edit">
              <Button
                type="link" size="small" icon={<EditOutlined />}
                onClick={() => navigate(`/inventory/${record.id}/edit`)}
              />
            </Tooltip>
          )}
          {canDeleteInventory && (
            <Popconfirm title="Delete this item?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
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
        : <span style={{ color: 'var(--app-text-soft)', fontSize: 12 }}>Not assigned</span>,
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
      <div style={{ padding: 24, minHeight: '100vh' }}>
        <Card
          style={{
            borderRadius: 12,
            textAlign: 'center',
            padding: '40px 0',
            background: 'rgba(8, 25, 40, 0.72)',
            border: '1px solid rgba(134, 166, 197, 0.12)',
            boxShadow: '0 20px 50px rgba(2, 10, 19, 0.22)',
          }}
        >
          <WarningOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
          <h2>Error Loading Inventory</h2>
          <p style={{ color: 'var(--app-text-muted)', marginBottom: 24 }}>{(error as Error)?.message}</p>
          <Space>
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['inventory'] })}>Retry</Button>
            {canCreateInventory && <Button onClick={() => navigate('/inventory/create')}>Add First Item</Button>}
          </Space>
        </Card>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const alertCount = (reorderAlerts as unknown[]).length;

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>

      {/* Page header */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--app-text)' }}>
            <DatabaseOutlined style={{ marginRight: 10, color: '#1677ff' }} />
            Inventory
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--app-text-muted)', fontSize: 13 }}>
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
          {canCreateInventory && (
            <Button
              type="primary" icon={<PlusOutlined />} size="large"
              style={{ borderRadius: 8 }}
              onClick={() => navigate('/inventory/create')}
            >
              Add Item
            </Button>
          )}
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

      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={16}>
          <Card
            style={{
              borderRadius: 12,
              border: '1px solid rgba(84, 214, 255, 0.18)',
              background: 'linear-gradient(135deg, rgba(8, 41, 63, 0.94) 0%, rgba(11, 57, 83, 0.88) 100%)',
              boxShadow: '0 20px 40px rgba(2, 10, 19, 0.18)',
            }}
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--app-text)' }}>Inventory Operations Desk</div>
                <div style={{ fontSize: 12, color: 'var(--app-text-muted)', marginTop: 4 }}>
                  Switch between stock risk, reserved inventory, and highest-value positions instantly.
                </div>
              </div>
              <Space wrap>
                <Segmented
                  value={inventoryLens}
                  onChange={(value) => setInventoryLens(value as typeof inventoryLens)}
                  options={[
                    { label: 'All', value: 'all' },
                    { label: 'Risk', value: 'risk' },
                    { label: 'Reserved', value: 'reserved' },
                    { label: 'Highest Value', value: 'value' },
                  ]}
                />
                <Segmented
                  value={tableDensity}
                  onChange={(value) => setTableDensity(value as typeof tableDensity)}
                  options={[
                    { label: 'Compact', value: 'small' },
                    { label: 'Comfort', value: 'middle' },
                  ]}
                />
                <Button onClick={resetWorkspace}>Reset</Button>
                {canExportInventory && (
                  <Button icon={<DownloadOutlined />} onClick={exportInventoryCsv}>
                    Export CSV
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            style={{
              borderRadius: 12,
              background: 'rgba(8, 25, 40, 0.72)',
              border: '1px solid rgba(134, 166, 197, 0.12)',
              boxShadow: '0 20px 50px rgba(2, 10, 19, 0.22)',
            }}
            styles={{ body: { padding: '16px 18px' } }}
          >
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>Reserved units</span>
                <strong>{inventoryInsights.totalReserved}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>Blocked value</span>
                <strong style={{ color: inventoryInsights.blockedValue > 0 ? '#fa8c16' : '#52c41a' }}>
                  {fmt(inventoryInsights.blockedValue)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>Available value</span>
                <strong>{fmt(inventoryInsights.availableValue)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>Largest position</span>
                <strong>
                  {inventoryInsights.highValueItem
                    ? `${inventoryInsights.highValueItem.product_name} (${fmt(toNum(inventoryInsights.highValueItem.quantity) * toNum(inventoryInsights.highValueItem.unit_cost))})`
                    : '—'}
                </strong>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {(toNum(summary?.outOfStockItems) > 0 || toNum(summary?.lowStockItems) > 0 || inventoryInsights.totalReserved > 0) && (
        <Alert
          style={{ marginBottom: 16, borderRadius: 10 }}
          type={toNum(summary?.outOfStockItems) > 0 ? 'warning' : 'info'}
          showIcon
          message="Inventory watchlist"
          description={[
            toNum(summary?.outOfStockItems) > 0 ? `${toNum(summary?.outOfStockItems)} items are fully out of stock.` : null,
            toNum(summary?.lowStockItems) > 0 ? `${toNum(summary?.lowStockItems)} items are below reorder level.` : null,
            inventoryInsights.totalReserved > 0 ? `${inventoryInsights.totalReserved} units are currently reserved.` : null,
          ].filter(Boolean).join(' ')}
        />
      )}

      {/* Main card with tabs */}
      <Card
        style={{
          borderRadius: 12,
          background: 'rgba(8, 25, 40, 0.72)',
          border: '1px solid rgba(134, 166, 197, 0.12)',
          boxShadow: '0 20px 50px rgba(2, 10, 19, 0.22)',
        }}
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
              {canCreateInventory && (
                <Button
                  type="primary" size="small" icon={<PlusOutlined />}
                  onClick={() => navigate('/inventory/create')}
                >
                  Add Item
                </Button>
              )}
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
                  <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(134, 166, 197, 0.12)' }}>
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
                      action={canCreateInventory ? <Button type="primary" size="small" onClick={() => navigate('/inventory/create')}>Add First Item</Button> : undefined}
                    />
                  )}

                  <Table
                    columns={columns}
                    dataSource={filteredItems}
                    rowKey="id"
                    loading={isLoading}
                    size={tableDensity}
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
                    size={tableDensity}
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
                <div style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>Supplier</div>
                <div style={{ fontWeight: 600 }}>{reorderModal.supplier_name || <span style={{ color: 'var(--app-text-soft)' }}>Not assigned</span>}</div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>Unit Cost</div>
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
              background: 'rgba(82,196,26,0.10)', border: '1px solid rgba(82,196,26,0.24)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: '#52c41a', fontWeight: 500 }}>Estimated Total</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color: 'var(--app-text)' }}>
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
        .row-out-of-stock td { background: rgba(255,77,79,0.10) !important; }
        .row-low-stock td { background: rgba(250,140,22,0.10) !important; }
        .ant-tabs-content-holder { padding: 0 20px 20px; }
      `}</style>
    </div>
  );
}
