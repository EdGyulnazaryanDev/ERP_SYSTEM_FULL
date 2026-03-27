import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Row, Col, Card, Tag, Table, Spin, Typography, Progress, Badge, Empty } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DollarOutlined, ShoppingCartOutlined, InboxOutlined, TeamOutlined, WarningOutlined, CrownOutlined } from '@ant-design/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { dashboardApi, type DashboardSummary } from '@/api/dashboard';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useAuthStore } from '@/store/authStore';

const { Text, Title } = Typography;
const CARD = { background: 'rgba(8,25,40,0.6)', border: '1px solid rgba(134,166,197,0.12)', borderRadius: 16 };
const HEAD = { borderBottom: '1px solid rgba(134,166,197,0.1)', background: 'transparent' };
const STATUS_COLOR: Record<string, string> = {
  completed: '#52c41a', paid: '#52c41a', pending: '#faad14',
  draft: '#8a9bb0', cancelled: '#ff4d4f', overdue: '#ff4d4f',
  sale: '#1677ff', purchase: '#722ed1',
};

function fmt(n: number, pre = '') {
  if (n >= 1_000_000) return `${pre}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${pre}${(n / 1_000).toFixed(1)}K`;
  return `${pre}${n.toLocaleString()}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function KpiCard({ icon, color, label, value, prefix = '', growth, sub }: {
  icon: React.ReactNode; color: string; label: string;
  value: number; prefix?: string; growth?: number; sub?: string;
}) {
  return (
    <Card style={{ ...CARD, borderTop: `2px solid ${color}` }} bodyStyle={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text style={{ color: '#8a9bb0', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Text>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f0f6ff', marginTop: 4, lineHeight: 1.2 }}>{fmt(value, prefix)}</div>
          {growth !== undefined && (
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              {growth >= 0 ? <ArrowUpOutlined style={{ color: '#52c41a', fontSize: 11 }} /> : <ArrowDownOutlined style={{ color: '#ff4d4f', fontSize: 11 }} />}
              <Text style={{ color: growth >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 12 }}>{Math.abs(growth)}% vs last month</Text>
            </div>
          )}
          {sub && <Text style={{ color: '#8a9bb0', fontSize: 12, marginTop: 4, display: 'block' }}>{sub}</Text>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'grid', placeItems: 'center' }}>
          <span style={{ color, fontSize: 20 }}>{icon}</span>
        </div>
      </div>
    </Card>
  );
}

function RevenueChart({ data }: { data: DashboardSummary['revenueChart'] }) {
  const chart = useMemo(() => data.map((d) => ({ ...d, date: fmtDate(d.date) })), [data]);
  if (!data.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <Empty description={<Text style={{ color: '#8a9bb0' }}>No transaction data yet</Text>} />
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1677ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#1677ff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#722ed1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#722ed1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(134,166,197,0.08)" />
        <XAxis dataKey="date" tick={{ fill: '#8a9bb0', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#8a9bb0', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(v, '$')} width={55} />
        <Tooltip
          contentStyle={{ background: 'rgba(8,25,40,0.95)', border: '1px solid rgba(134,166,197,0.15)', borderRadius: 10 }}
          labelStyle={{ color: '#f0f6ff' }}
          formatter={(v: any, name: any) => [fmt(Number(v ?? 0), '$'), name === 'sales' ? 'Sales' : 'Purchases']}
        />
        <Legend formatter={(v) => <span style={{ color: '#8a9bb0', fontSize: 12 }}>{v === 'sales' ? 'Sales' : 'Purchases'}</span>} />
        <Area type="monotone" dataKey="sales" stroke="#1677ff" strokeWidth={2} fill="url(#gS)" />
        <Area type="monotone" dataKey="purchases" stroke="#722ed1" strokeWidth={2} fill="url(#gP)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function RecentTx({ data }: { data: DashboardSummary['recentTransactions'] }) {
  const cols = [
    { title: 'Ref', dataIndex: 'number', key: 'number', render: (v: string) => <Text style={{ color: '#7dd3fc', fontSize: 12 }}>{v}</Text> },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'} style={{ fontSize: 11 }}>{v}</Tag> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v: number) => <Text style={{ color: '#f0f6ff', fontWeight: 600 }}>{fmt(v, '$')}</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => <Badge color={STATUS_COLOR[v] ?? '#8a9bb0'} text={<Text style={{ color: '#c8dff0', fontSize: 12 }}>{v}</Text>} /> },
    { title: 'Date', dataIndex: 'date', key: 'date', render: (v: string) => <Text style={{ color: '#8a9bb0', fontSize: 12 }}>{fmtDate(v)}</Text> },
  ];
  return <Table dataSource={data} columns={cols} rowKey="id" pagination={false} size="small" style={{ background: 'transparent' }} />;
}

function InventoryPanel({ summary, lowStock }: {
  summary: DashboardSummary['inventorySummary'];
  lowStock: DashboardSummary['lowStockItems'];
}) {
  if (!summary) return null;
  const rate = summary.totalItems > 0
    ? Math.round(((summary.totalItems - summary.outOfStock) / summary.totalItems) * 100) : 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Total SKUs', value: summary.totalItems, color: '#f0f6ff' },
          { label: 'Total Value', value: fmt(summary.totalValue, '$'), color: '#f0f6ff' },
          { label: 'Low Stock', value: summary.lowStock, color: summary.lowStock > 0 ? '#faad14' : '#52c41a' },
          { label: 'Out of Stock', value: summary.outOfStock, color: summary.outOfStock > 0 ? '#ff4d4f' : '#52c41a' },
        ].map((s) => (
          <div key={s.label} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(134,166,197,0.08)' }}>
            <Text style={{ color: '#8a9bb0', fontSize: 11 }}>{s.label}</Text>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: '#8a9bb0', fontSize: 12 }}>In-stock rate</Text>
          <Text style={{ color: '#f0f6ff', fontSize: 12, fontWeight: 600 }}>{rate}%</Text>
        </div>
        <Progress percent={rate} showInfo={false}
          strokeColor={rate > 80 ? '#52c41a' : rate > 60 ? '#faad14' : '#ff4d4f'}
          trailColor="rgba(134,166,197,0.1)" />
      </div>
      {lowStock.length > 0 && (
        <div>
          <Text style={{ color: '#faad14', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <WarningOutlined /> Reorder Alerts
          </Text>
          {lowStock.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(134,166,197,0.06)' }}>
              <div>
                <Text style={{ color: '#c8dff0', fontSize: 13 }}>{item.name}</Text>
                <Text style={{ color: '#8a9bb0', fontSize: 11, display: 'block' }}>{item.sku}</Text>
              </div>
              <Tag color={item.qty <= 0 ? 'red' : 'orange'} style={{ fontSize: 11 }}>{item.qty} / {item.reorderLevel}</Tag>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanBadge({ info, userCount }: { info: DashboardSummary['planInfo']; userCount: number }) {
  const colors: Record<string, string> = { starter: '#52c41a', basic: '#1677ff', pro: '#722ed1', enterprise: '#fa8c16' };
  const color = colors[info.planName.toLowerCase()] ?? '#1677ff';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}18`, display: 'grid', placeItems: 'center' }}>
          <CrownOutlined style={{ color, fontSize: 18 }} />
        </div>
        <div>
          <Text style={{ color: '#f0f6ff', fontWeight: 700, fontSize: 16 }}>{info.planName}</Text>
          <div>
            <Tag color={info.status === 'active' ? 'green' : 'orange'} style={{ fontSize: 11 }}>{info.status}</Tag>
            {info.billingCycle && <Tag style={{ fontSize: 11 }}>{info.billingCycle}</Tag>}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(134,166,197,0.08)' }}>
        <TeamOutlined style={{ color: '#7dd3fc' }} />
        <Text style={{ color: '#c8dff0' }}>{userCount} active users</Text>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {info.features.slice(0, 8).map((f) => (
          <Tag key={f} style={{ fontSize: 10, background: 'rgba(22,119,255,0.1)', border: '1px solid rgba(22,119,255,0.2)', color: '#7dd3fc' }}>{f}</Tag>
        ))}
        {info.features.length > 8 && <Tag style={{ fontSize: 10, color: '#8a9bb0' }}>+{info.features.length - 8} more</Tag>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { isPrivilegedUser } = useAccessControl();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await dashboardApi.getSummary()).data,
    staleTime: 60_000,
    retry: 1,
  });
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <Spin size="large" />
    </div>
  );

  if (error || !data) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Title level={4} style={{ color: '#f0f6ff', margin: 0 }}>{greeting}, {user?.name?.split(' ')[0] ?? 'there'} 👋</Title>
      <Card style={CARD}><Empty description={<Text style={{ color: '#8a9bb0' }}>Dashboard data unavailable.</Text>} /></Card>
    </div>
  );

  const { kpis, revenueChart, recentTransactions, inventorySummary, lowStockItems, userCount, planInfo } = data;
  const hasTx = data.enabledFeatures.includes('transactions');
  const hasInv = data.enabledFeatures.includes('inventory');
  const hasProd = data.enabledFeatures.includes('products');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ color: '#f0f6ff', margin: 0 }}>{greeting}, {user?.name?.split(' ')[0] ?? 'there'} 👋</Title>
          <Text style={{ color: '#8a9bb0' }}>{isPrivilegedUser ? "Here's your business overview" : "Here's what's happening today"}</Text>
        </div>
        <Tag icon={<CrownOutlined />} color="blue" style={{ fontSize: 13, padding: '4px 12px' }}>{planInfo.planName} Plan</Tag>
      </div>

      <Row gutter={[16, 16]}>
        {kpis.revenue && <Col xs={24} sm={12} lg={6}><KpiCard icon={<DollarOutlined />} color="#1677ff" label={kpis.revenue.label} value={kpis.revenue.value} prefix="$" growth={kpis.revenue.growth} /></Col>}
        {kpis.inventoryValue && <Col xs={24} sm={12} lg={6}><KpiCard icon={<InboxOutlined />} color="#52c41a" label={kpis.inventoryValue.label} value={kpis.inventoryValue.value} prefix="$" sub={kpis.inventoryValue.sub} /></Col>}
        {kpis.products && <Col xs={24} sm={12} lg={6}><KpiCard icon={<ShoppingCartOutlined />} color="#722ed1" label={kpis.products.label} value={kpis.products.value} sub={kpis.products.sub} /></Col>}
        <Col xs={24} sm={12} lg={6}><KpiCard icon={<TeamOutlined />} color="#fa8c16" label="Active Users" value={userCount} /></Col>
      </Row>

      <Row gutter={[16, 16]}>
        {hasTx && (
          <Col xs={24} lg={16}>
            <Card title={<Text style={{ color: '#f0f6ff', fontWeight: 600 }}>Revenue vs Purchases — Last 30 Days</Text>} style={CARD} headStyle={HEAD} bodyStyle={{ paddingTop: 16 }}>
              <RevenueChart data={revenueChart} />
            </Card>
          </Col>
        )}
        <Col xs={24} lg={hasTx ? 8 : 24}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title={<Text style={{ color: '#f0f6ff', fontWeight: 600 }}>Subscription</Text>} style={CARD} headStyle={HEAD}>
              <PlanBadge info={planInfo} userCount={userCount} />
            </Card>
            {hasInv && inventorySummary && (
              <Card title={<Text style={{ color: '#f0f6ff', fontWeight: 600 }}>Inventory Health</Text>} style={CARD} headStyle={HEAD}>
                <InventoryPanel summary={inventorySummary} lowStock={lowStockItems} />
              </Card>
            )}
          </div>
        </Col>
      </Row>

      {hasTx && recentTransactions.length > 0 && (
        <Card title={<Text style={{ color: '#f0f6ff', fontWeight: 600 }}>Recent Transactions</Text>} style={CARD} headStyle={HEAD}>
          <RecentTx data={recentTransactions} />
        </Card>
      )}

      {!hasTx && !hasInv && !hasProd && (
        <Card style={CARD}>
          <Empty description={<Text style={{ color: '#8a9bb0' }}>Upgrade your plan to unlock revenue tracking, inventory, and more.</Text>} />
        </Card>
      )}
    </div>
  );
}
