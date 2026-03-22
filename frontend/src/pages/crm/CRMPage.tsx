import { useState, useMemo } from 'react';
import { Tabs, Row, Col, Card } from 'antd';
import {
  TeamOutlined, RiseOutlined, FundOutlined, ContactsOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { crmApi } from '@/api/crm';
import CustomersTab from './CustomersTab';
import LeadsTab from './LeadsTab';
import OpportunitiesTab from './OpportunitiesTab';
import ContactsTab from './ContactsTab';

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
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, color: 'var(--app-text)' }}>{value}</div>
          <div style={{ fontSize: 12, color: active ? color : 'var(--app-text-muted)', fontWeight: active ? 600 : 400, marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </Card>
  );
}

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState('customers');

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => crmApi.getCustomers().then(res => res.data),
  });
  const { data: leadsData } = useQuery({
    queryKey: ['leads'],
    queryFn: () => crmApi.getLeads().then(res => res.data),
  });
  const { data: opportunitiesData } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => crmApi.getOpportunities().then(res => res.data),
  });

  const customers = Array.isArray(customersData) ? customersData : (customersData?.data || []);
  const leads = Array.isArray(leadsData) ? leadsData : (leadsData?.data || []);
  const opportunities = Array.isArray(opportunitiesData) ? opportunitiesData : (opportunitiesData?.data || []);

  const stats = useMemo(() => ({
    totalCustomers: customers.length,
    activeCustomers: customers.filter((c: any) => c.status === 'active').length,
    openLeads: leads.filter((l: any) => l.status !== 'won' && l.status !== 'lost').length,
    openOpportunities: opportunities.filter((o: any) => o.stage !== 'closed_won' && o.stage !== 'closed_lost').length,
  }), [customers, leads, opportunities]);

  const items = [
    { key: 'customers', label: 'Customers', children: <CustomersTab /> },
    { key: 'leads', label: 'Leads', children: <LeadsTab /> },
    { key: 'opportunities', label: 'Opportunities', children: <OpportunitiesTab /> },
    { key: 'contacts', label: 'Contacts', children: <ContactsTab /> },
  ];

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--app-text)' }}>
            <TeamOutlined style={{ marginRight: 10, color: '#1677ff' }} />
            CRM
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--app-text-muted)', fontSize: 13 }}>
            Customers, leads, opportunities and contacts
          </p>
        </div>
      </div>

      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Total Customers" value={stats.totalCustomers} color="#1677ff" icon={<TeamOutlined />}
            active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Active Customers" value={stats.activeCustomers} color="#52c41a" icon={<TeamOutlined />}
            active={false} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Open Leads" value={stats.openLeads} color="#fa8c16" icon={<RiseOutlined />}
            active={activeTab === 'leads'} onClick={() => setActiveTab('leads')} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Open Opportunities" value={stats.openOpportunities} color="#722ed1" icon={<FundOutlined />}
            active={activeTab === 'opportunities'} onClick={() => setActiveTab('opportunities')} />
        </Col>
      </Row>

      <Card
        style={{
          borderRadius: 12,
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
          tabBarStyle={{ marginBottom: 0 }}
        />
      </Card>
    </div>
  );
}
