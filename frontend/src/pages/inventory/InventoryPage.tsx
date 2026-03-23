import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table, Button, Card, Space, Tag, Input, Select, Row, Col,
  message, Popconfirm, Alert, Badge, Modal, InputNumber, Tabs, Tooltip,
  Progress, Segmented, Pagination,
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
import styles from './InventoryPage.module.css';

const { Search } = Input;
type InventoryVariant = 'aurora' | 'graphite' | 'copper';
const variantClassMap: Record<InventoryVariant, string> = {
  aurora: styles.variantAurora,
  graphite: styles.variantGraphite,
  copper: styles.variantCopper,
};

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
      className={`${styles.statCard} ${active ? styles.statCardActive : ''}`}
      onClick={onClick}
      style={{ ['--stat-color' as string]: color, cursor: onClick ? 'pointer' : 'default' }}
      styles={{ body: { padding: '14px 18px' } }}
    >
      <div className={styles.statBody}>
        <div className={styles.statIcon}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className={styles.statValue}>{value}</div>
          <div className={styles.statLabel} style={active ? { color, fontWeight: 600 } : undefined}>{label}</div>
          {sub && <div className={styles.statSub}>{sub}</div>}
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
  const [inventoryVariant, setInventoryVariant] = useState<InventoryVariant>('aurora');
  const [tableDensity, setTableDensity] = useState<'small' | 'middle'>('small');
  const [inventoryPage, setInventoryPage] = useState(1);
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

  const filteredInventoryInsights = useMemo(() => {
    const filteredValue = filteredItems.reduce((sum, item) => sum + (toNum(item.quantity) * toNum(item.unit_cost)), 0);
    const filteredReserved = filteredItems.reduce((sum, item) => sum + toNum(item.reserved_quantity), 0);
    const riskCount = filteredItems.filter((item) => toNum(item.quantity) === 0 || toNum(item.quantity) <= toNum(item.reorder_level)).length;
    const activeLocations = new Set(filteredItems.map((item) => item.location).filter(Boolean)).size;

    return {
      filteredValue,
      filteredReserved,
      riskCount,
      activeLocations,
    };
  }, [filteredItems]);

  const inventoryPageSize = tableDensity === 'small' ? 8 : 6;
  const inventoryPageCount = Math.max(1, Math.ceil(filteredItems.length / inventoryPageSize));
  const currentInventoryPage = Math.min(inventoryPage, inventoryPageCount);
  const pagedItems = useMemo(() => {
    const start = (currentInventoryPage - 1) * inventoryPageSize;
    return filteredItems.slice(start, start + inventoryPageSize);
  }, [currentInventoryPage, filteredItems, inventoryPageSize]);

  const resetWorkspace = () => {
    setSearchText('');
    setLocationFilter(undefined);
    setActiveStatFilter(null);
    setInventoryLens('all');
    setActiveTab('inventory');
    setInventoryPage(1);
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
      <div className={`${styles.root} ${variantClassMap[inventoryVariant]}`}>
        <Card
          className={styles.errorCard}
        >
          <WarningOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
          <h2>Error Loading Inventory</h2>
          <p style={{ color: 'var(--app-text-muted)', marginBottom: 24 }}>{(error as Error)?.message}</p>
          <Space>
            <Button type="primary" className={styles.primaryButton} icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['inventory'] })}>Retry</Button>
            {canCreateInventory && <Button onClick={() => navigate('/inventory/create')}>Add First Item</Button>}
          </Space>
        </Card>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const alertCount = (reorderAlerts as unknown[]).length;

  return (
    <div className={`${styles.root} ${variantClassMap[inventoryVariant]}`}>
      <div className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroHeader}>
          <div>
            <div className={styles.eyebrow}>
              <ClockCircleOutlined />
              Live stock command
            </div>
            <div className={styles.titleRow}>
              <span className={styles.titleIcon}>
                <DatabaseOutlined />
              </span>
              <h1 className={styles.title}>Inventory</h1>
            </div>
            <p className={styles.subtitle}>
              Track stock levels, valuations, reservations, and reorder pressure across every location from one focused operations surface.
            </p>
          </div>
          <Space className={styles.heroActions}>
            <Button
              icon={<ReloadOutlined />}
              className={styles.softButton}
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
                className={styles.primaryButton}
                onClick={() => navigate('/inventory/create')}
              >
                Add Item
              </Button>
            )}
          </Space>
        </div>
        <div className={styles.heroMeta}>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Live inventory value</span>
            <span className={styles.metaValue}>{fmt(summary?.totalValue)}</span>
            <span className={styles.metaHint}>Current warehouse carrying value</span>
          </div>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Watchlist pressure</span>
            <span className={styles.metaValue}>{toNum(summary?.lowStockItems) + toNum(summary?.outOfStockItems)}</span>
            <span className={styles.metaHint}>Items needing attention or replenishment</span>
          </div>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Reserved units</span>
            <span className={styles.metaValue}>{inventoryInsights.totalReserved}</span>
            <span className={styles.metaHint}>Committed stock not freely available</span>
          </div>
        </div>
      </section>

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
            sub="Units across all locations"
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
            sub="Quantity x unit cost"
          />
        </Col>
      </Row>

      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={16}>
          <Card
            className={styles.controlPanel}
            styles={{ body: { padding: '18px 20px' } }}
          >
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Inventory Operations Desk</h2>
                <p className={styles.panelText}>
                  Switch between stock risk, reserved inventory, highest-value positions, and alternate visual variants without leaving the page.
                </p>
              </div>
              <div className={styles.panelControls}>
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
                  value={inventoryVariant}
                  onChange={(value) => setInventoryVariant(value as InventoryVariant)}
                  options={[
                    { label: 'Aurora', value: 'aurora' },
                    { label: 'Graphite', value: 'graphite' },
                    { label: 'Copper', value: 'copper' },
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
                <Button className={styles.softButton} onClick={resetWorkspace}>Reset</Button>
                {canExportInventory && (
                  <Button className={styles.softButton} icon={<DownloadOutlined />} onClick={exportInventoryCsv}>
                    Export CSV
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            className={styles.insightPanel}
            styles={{ body: { padding: '18px 20px' } }}
          >
            <div className={styles.insightGrid}>
              <div className={styles.insightRow}>
                <span className={styles.insightLabel}>Reserved units</span>
                <strong className={styles.insightValue}>{inventoryInsights.totalReserved}</strong>
              </div>
              <div className={styles.insightRow}>
                <span className={styles.insightLabel}>Blocked value</span>
                <strong className={styles.insightValue} style={{ color: inventoryInsights.blockedValue > 0 ? '#fa8c16' : '#52c41a' }}>
                  {fmt(inventoryInsights.blockedValue)}
                </strong>
              </div>
              <div className={styles.insightRow}>
                <span className={styles.insightLabel}>Available value</span>
                <strong className={styles.insightValue}>{fmt(inventoryInsights.availableValue)}</strong>
              </div>
              <div className={styles.insightRow}>
                <span className={styles.insightLabel}>Largest position</span>
                <strong className={styles.insightValue}>
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
          className={styles.watchlist}
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

      <Card
        className={styles.workspaceCard}
        styles={{ body: { padding: 0 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
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
                  <div className={styles.filterBar}>
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
                          <Button size="small" className={styles.softButton} onClick={() => setActiveStatFilter(null)}>
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
                      action={canCreateInventory ? <Button type="primary" size="small" className={styles.primaryButton} onClick={() => navigate('/inventory/create')}>Add First Item</Button> : undefined}
                    />
                  )}

                  <div className={styles.inventoryBoard}>
                    <div className={styles.inventoryBoardHeader}>
                      <div className={styles.inventoryBoardTitleBlock}>
                        <h3 className={styles.inventoryBoardTitle}>Inventory Signal Grid</h3>
                        <p className={styles.inventoryBoardText}>
                          A denser visual surface for product health, carrying value, supplier ownership, and replenishment pressure.
                        </p>
                      </div>
                      <div className={styles.inventorySummaryGrid}>
                        <div className={styles.summaryChip}>
                          <span className={styles.summaryChipLabel}>Visible items</span>
                          <strong className={styles.summaryChipValue}>{filteredItems.length}</strong>
                        </div>
                        <div className={styles.summaryChip}>
                          <span className={styles.summaryChipLabel}>Visible value</span>
                          <strong className={styles.summaryChipValue}>{fmt(filteredInventoryInsights.filteredValue)}</strong>
                        </div>
                        <div className={styles.summaryChip}>
                          <span className={styles.summaryChipLabel}>Reserved units</span>
                          <strong className={styles.summaryChipValue}>{filteredInventoryInsights.filteredReserved}</strong>
                        </div>
                        <div className={styles.summaryChip}>
                          <span className={styles.summaryChipLabel}>At risk</span>
                          <strong className={styles.summaryChipValue}>{filteredInventoryInsights.riskCount}</strong>
                        </div>
                      </div>
                    </div>

                    <div className={styles.signalGrid}>
                      {pagedItems.map((item, index) => {
                        const qty = toNum(item.quantity);
                        const reserved = toNum(item.reserved_quantity);
                        const available = toNum(item.available_quantity);
                        const reorderLevel = toNum(item.reorder_level);
                        const reorderQty = toNum(item.reorder_quantity) || 50;
                        const max = toNum(item.max_stock_level) || 100;
                        const fill = Math.min(Math.round((qty / max) * 100), 100);
                        const isOut = qty === 0;
                        const isLow = !isOut && qty <= reorderLevel;
                        const cardTone = isOut ? styles.signalCardDanger : isLow ? styles.signalCardWarning : styles.signalCardHealthy;
                        const stockValue = qty * toNum(item.unit_cost);
                        const itemRank = (currentInventoryPage - 1) * inventoryPageSize + index + 1;

                        return (
                          <article key={item.id} className={`${styles.signalCard} ${cardTone}`}>
                            <div className={styles.signalCardTop}>
                              <span className={styles.signalRank}>#{String(itemRank).padStart(2, '0')}</span>
                              <StockPill qty={qty} reorderLevel={reorderLevel} />
                            </div>

                            <div className={styles.signalTitleBlock}>
                              <h4 className={styles.signalName}>{item.product_name || 'Unnamed item'}</h4>
                              <div className={styles.signalSku}>{item.sku || 'NO-SKU'}</div>
                            </div>

                            <div className={styles.signalMeta}>
                              <span className={styles.signalMetaTag}>
                                <EnvironmentOutlined />
                                {item.location || 'No location'}
                              </span>
                              <span className={styles.signalMetaTag}>
                                <ShoppingCartOutlined />
                                {item.supplier_name || 'No supplier'}
                              </span>
                            </div>

                            <div className={styles.signalMetrics}>
                              <div className={styles.signalMetric}>
                                <span className={styles.signalMetricLabel}>Available</span>
                                <strong className={styles.signalMetricValue}>{available}</strong>
                              </div>
                              <div className={styles.signalMetric}>
                                <span className={styles.signalMetricLabel}>Reserved</span>
                                <strong className={styles.signalMetricValue}>{reserved}</strong>
                              </div>
                              <div className={styles.signalMetric}>
                                <span className={styles.signalMetricLabel}>Value</span>
                                <strong className={styles.signalMetricValue}>{fmt(stockValue)}</strong>
                              </div>
                              <div className={styles.signalMetric}>
                                <span className={styles.signalMetricLabel}>Reorder</span>
                                <strong className={styles.signalMetricValue}>{reorderQty}</strong>
                              </div>
                            </div>

                            <div className={styles.signalGauge}>
                              <div className={styles.signalGaugeHeader}>
                                <span className={styles.signalGaugeLabel}>Capacity fill</span>
                                <strong className={styles.signalGaugeValue}>{fill}%</strong>
                              </div>
                              <Progress
                                percent={fill}
                                size="small"
                                strokeColor={isOut ? '#ff4d4f' : isLow ? '#fa8c16' : '#22c55e'}
                                showInfo={false}
                              />
                              <div className={styles.signalGaugeHint}>
                                <span>{qty} on hand</span>
                                <span>max {max}</span>
                              </div>
                            </div>

                            <div className={styles.signalPrices}>
                              <span>Cost {fmt(item.unit_cost)}</span>
                              <span>Price {fmt(item.unit_price)}</span>
                            </div>

                            <div className={styles.signalActions}>
                              <Button
                                size="small"
                                className={styles.softButton}
                                icon={<ShoppingCartOutlined />}
                                onClick={() => {
                                  setReorderModal({
                                    id: item.id,
                                    product_name: item.product_name,
                                    reorder_quantity: reorderQty,
                                    unit_cost: toNum(item.unit_cost),
                                    supplier_name: item.supplier_name,
                                  });
                                  setReorderQty(reorderQty);
                                }}
                              >
                                Reorder Qty
                              </Button>
                              {canEditInventory && (
                                <Button
                                  size="small"
                                  className={styles.softButton}
                                  icon={<EditOutlined />}
                                  onClick={() => navigate(`/inventory/${item.id}/edit`)}
                                >
                                  Edit
                                </Button>
                              )}
                              {canDeleteInventory && (
                                <Popconfirm title="Delete this item?" onConfirm={() => handleDelete(item.id)} okText="Yes" cancelText="No">
                                  <Button size="small" danger icon={<DeleteOutlined />}>
                                    Remove
                                  </Button>
                                </Popconfirm>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    {!isLoading && filteredItems.length > 0 && (
                      <div className={styles.commandPagination}>
                        <Pagination
                          current={currentInventoryPage}
                          pageSize={inventoryPageSize}
                          total={filteredItems.length}
                          onChange={setInventoryPage}
                          showSizeChanger={false}
                          showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
                        />
                      </div>
                    )}
                  </div>
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
            <Row gutter={16} className={styles.modalMeta}>
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
            <div className={styles.modalEstimate}>
              <span style={{ color: '#52c41a', fontWeight: 500 }}>Estimated Total</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color: 'var(--app-text)' }}>
                ${(reorderQty * Number(reorderModal.unit_cost)).toFixed(2)}
              </span>
            </div>
            <Alert
              className={styles.modalInfo}
              type="info"
              message="This creates a pending purchase workflow: requisition approval, pending transaction, draft accounting entry, then inbound shipment. Inventory increases only after the shipment is delivered."
              showIcon
            />
          </div>
        )}
      </Modal>
      </div>
    </div>
  );
}
