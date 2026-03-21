import { useState, useMemo } from 'react';
import { Tabs, Row, Col, Card } from 'antd';
import { ShoppingCartOutlined, FileTextOutlined, TeamOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { procurementApi } from '@/api/procurement';
import apiClient from '@/api/client';
import PurchaseOrdersTab from './PurchaseOrdersTab';
import PurchaseRequisitionsTab from './PurchaseRequisitionsTab';
import VendorsTab from './VendorsTab';

function StatCard({ label, value, color, icon, active, onClick }: {
  label: string; value: number | string; color: string; icon: React.ReactNode;
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
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, color: '#1a1a2e' }}>{value}</div>
          <div style={{ fontSize: 12, color: active ? color : '#8c8c8c', fontWeight: active ? 600 : 400, marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </Card>
  );
}

export default function ProcurementPage() {
  const [activeTab, setActiveTab] = useState('purchase-orders');

  const { data: posData } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => procurementApi.getPurchaseOrders().then(res => res.data),
  });
  const { data: reqsData } = useQuery({
    queryKey: ['purchase-requisitions'],
    queryFn: () => procurementApi.getRequisitions().then(res => res.data),
  });
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => apiClient.get('/suppliers').then(res => res.data),
  });

  const pos = Array.isArray(posData) ? posData : (posData?.data || []);
  const reqs = Array.isArray(reqsData) ? reqsData : (reqsData?.data || []);
  const vendors = Array.isArray(vendorsData) ? vendorsData : (vendorsData?.data || []);

  const stats = useMemo(() => ({
    totalPOs: pos.length,
    pendingApproval: pos.filter((p: any) => ['pending_approval', 'pending', 'draft'].includes((p.status || '').toLowerCase())).length,
    totalReqs: reqs.length,
    activeVendors: vendors.filter((v: any) => v.is_active !== false).length,
  }), [pos, reqs, vendors]);

  const items = [
    { key: 'purchase-orders', label: 'Purchase Orders', children: <PurchaseOrdersTab /> },
    { key: 'requisitions', label: 'Requisitions', children: <PurchaseRequisitionsTab /> },
    { key: 'vendors', label: 'Vendors', children: <VendorsTab /> },
  ];

  return (
    <div style={{ padding: 24, background: '#f5f6fa', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>
          <ShoppingCartOutlined style={{ marginRight: 10, color: '#1677ff' }} />
          Procurement
        </h1>
        <p style={{ margin: '4px 0 0', color: '#8c8c8c', fontSize: 13 }}>
          Purchase orders, requisitions and vendor management
        </p>
      </div>

      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Total POs" value={stats.totalPOs} color="#1677ff" icon={<ShoppingCartOutlined />}
            active={activeTab === 'purchase-orders'} onClick={() => setActiveTab('purchase-orders')} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Pending Approval" value={stats.pendingApproval} color="#fa8c16" icon={<CheckCircleOutlined />}
            active={false} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Requisitions" value={stats.totalReqs} color="#722ed1" icon={<FileTextOutlined />}
            active={activeTab === 'requisitions'} onClick={() => setActiveTab('requisitions')} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Active Vendors" value={stats.activeVendors} color="#52c41a" icon={<TeamOutlined />}
            active={activeTab === 'vendors'} onClick={() => setActiveTab('vendors')} />
        </Col>
      </Row>

      <Card style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }} bodyStyle={{ padding: 0 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={items}
          style={{ padding: '0 20px' }}
          tabBarStyle={{ marginBottom: 0 }}
        />
      </Card>
    </div>
  );
}
