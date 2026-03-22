import { useState, useMemo } from 'react';
import { Tabs, Row, Col, Card } from 'antd';
import {
  HomeOutlined, AppstoreOutlined, SwapOutlined,
  CheckCircleOutlined, InboxOutlined, RiseOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import WarehousesTab from './WarehousesTab';
import BinsTab from './BinsTab';
import StockMovementsTab from './StockMovementsTab';

function StatCard({
  label, value, sub, color, icon, active, onClick,
}: {
  label: string; value: number | string; sub?: string; color: string;
  icon: React.ReactNode; active?: boolean; onClick?: () => void;
}) {
  return (
    <Card
      size="small"
      onClick={onClick}
      style={{
        borderRadius: 14,
        border: active ? `2px solid ${color}` : `1px solid ${color}22`,
        background: active
          ? `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`
          : `linear-gradient(135deg, ${color}12 0%, rgba(8, 25, 40, 0.76) 100%)`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: active ? `0 4px 16px ${color}28` : '0 16px 36px rgba(2, 10, 19, 0.18)',
        transform: active ? 'translateY(-2px)' : undefined,
      }}
      bodyStyle={{ padding: '14px 18px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10,
          background: active ? `${color}28` : `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, fontSize: 18, flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: 'var(--app-text)' }}>{value}</div>
          <div style={{ fontSize: 12, color: active ? color : 'var(--app-text-muted)', fontWeight: active ? 600 : 400, marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--app-text-soft)', marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

export default function WarehousePage() {
  const [activeTab, setActiveTab] = useState('warehouses');

  const normalize = (d: unknown): any[] => {
    if (Array.isArray(d)) return d;
    if (Array.isArray((d as any)?.data)) return (d as any).data;
    return [];
  };

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => apiClient.get('/warehouse').then(r => normalize(r.data)),
  });
  const { data: bins = [] } = useQuery({
    queryKey: ['bins'],
    queryFn: () => apiClient.get('/warehouse/bins/all').then(r => normalize(r.data)),
  });
  const { data: movements = [] } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: () => apiClient.get('/warehouse/movements/all').then(r => normalize(r.data)),
  });

  const stats = useMemo(() => ({
    totalWarehouses: warehouses.length,
    activeWarehouses: warehouses.filter((w: any) => w.is_active !== false).length,
    totalBins: bins.length,
    receipts: movements.filter((m: any) => m.movement_type === 'RECEIPT').length,
    issues: movements.filter((m: any) => m.movement_type === 'ISSUE').length,
    totalMovements: movements.length,
  }), [warehouses, bins, movements]);

  const items = [
    { key: 'warehouses', label: <span><HomeOutlined style={{ marginRight: 6 }} />Warehouses</span>, children: <WarehousesTab /> },
    { key: 'bins', label: <span><AppstoreOutlined style={{ marginRight: 6 }} />Bins & Locations</span>, children: <BinsTab /> },
    { key: 'movements', label: <span><SwapOutlined style={{ marginRight: 6 }} />Stock Movements</span>, children: <StockMovementsTab /> },
  ];

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>🏭</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                Warehouse Management
              </h1>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
                Locations, bins, and stock movement tracking
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, textAlign: 'center' }}>
          {[
            { label: 'Warehouses', value: stats.totalWarehouses, color: '#36cfc9' },
            { label: 'Bins', value: stats.totalBins, color: '#9254de' },
            { label: 'Movements', value: stats.totalMovements, color: '#ffa940' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              padding: '8px 18px', borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8} md={4}>
          <StatCard label="Total Warehouses" value={stats.totalWarehouses} color="#1677ff"
            icon={<HomeOutlined />} active={activeTab === 'warehouses'} onClick={() => setActiveTab('warehouses')} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard label="Active" value={stats.activeWarehouses} color="#52c41a"
            sub={`of ${stats.totalWarehouses}`} icon={<CheckCircleOutlined />} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard label="Total Bins" value={stats.totalBins} color="#722ed1"
            icon={<AppstoreOutlined />} active={activeTab === 'bins'} onClick={() => setActiveTab('bins')} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard label="Total Movements" value={stats.totalMovements} color="#fa8c16"
            icon={<SwapOutlined />} active={activeTab === 'movements'} onClick={() => setActiveTab('movements')} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard label="Receipts" value={stats.receipts} color="#13c2c2"
            icon={<InboxOutlined />} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard label="Issues" value={stats.issues} color="#ff4d4f"
            icon={<RiseOutlined />} />
        </Col>
      </Row>

      {/* Main Card */}
      <Card
        style={{
          borderRadius: 14,
          background: 'rgba(8, 25, 40, 0.72)',
          border: '1px solid rgba(134, 166, 197, 0.12)',
          boxShadow: '0 20px 50px rgba(2, 10, 19, 0.22)',
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={items}
          style={{ padding: '0 20px' }}
          tabBarStyle={{ marginBottom: 0, borderBottom: '1px solid rgba(134, 166, 197, 0.12)' }}
        />
      </Card>
    </div>
  );
}
