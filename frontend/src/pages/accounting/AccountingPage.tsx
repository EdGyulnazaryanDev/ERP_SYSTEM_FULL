import { useState } from 'react';
import { Tabs, Card, Row, Col } from 'antd';
import {
  BookOutlined, BankOutlined, ArrowUpOutlined, ArrowDownOutlined,
  FileTextOutlined, AccountBookOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { accountingApi } from '@/api/accounting';
import ChartOfAccountsTab from './ChartOfAccountsTab';
import JournalEntriesTab from './JournalEntriesTab';
import AccountsPayableTab from './AccountsPayableTab';
import AccountsReceivableTab from './AccountsReceivableTab';
import BankAccountsTab from './BankAccountsTab';

function SummaryCard({
  label, value, color, icon, sub,
}: {
  label: string; value: string | number; color: string; icon: React.ReactNode; sub?: string;
}) {
  return (
    <Card
      size="small"
      style={{ borderRadius: 12, border: `1px solid ${color}22`, background: `${color}08`, height: '100%' }}
      styles={{ body: { padding: '14px 18px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, fontSize: 18, flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, color: 'var(--app-text)' }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--app-text-muted)', marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--app-text-soft)', marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState('journal-entries');

  const { data: jeData } = useQuery({ queryKey: ['journal-entries'], queryFn: () => accountingApi.getJournalEntries().then(r => r.data) });
  const { data: apData } = useQuery({ queryKey: ['accounts-payable'], queryFn: () => accountingApi.getAccountsPayable().then(r => r.data) });
  const { data: arData } = useQuery({ queryKey: ['accounts-receivable'], queryFn: () => accountingApi.getAccountsReceivable().then(r => r.data) });
  const { data: bankData } = useQuery({ queryKey: ['bank-accounts'], queryFn: () => accountingApi.getBankAccounts().then(r => r.data) });

  const jeList  = Array.isArray(jeData)   ? jeData   : (jeData   as any)?.data || [];
  const apList  = Array.isArray(apData)   ? apData   : (apData   as any)?.data || [];
  const arList  = Array.isArray(arData)   ? arData   : (arData   as any)?.data || [];
  const bankList= Array.isArray(bankData) ? bankData : (bankData as any)?.data || [];

  const toNum = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };
  const fmt = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalAP   = apList.reduce((s: number, r: any) => s + toNum(r.balance_amount), 0);
  const totalAR   = arList.reduce((s: number, r: any) => s + toNum(r.balance_amount), 0);
  const totalBank = bankList.reduce((s: number, r: any) => s + toNum(r.current_balance), 0);
  const draftJE   = jeList.filter((j: any) => j.status === 'draft').length;

  const tabItems = [
    {
      key: 'journal-entries',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BookOutlined />Journal Entries
          {draftJE > 0 && (
            <span style={{ background: '#fa8c16', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px', lineHeight: '16px' }}>
              {draftJE}
            </span>
          )}
        </span>
      ),
      children: <JournalEntriesTab />,
    },
    {
      key: 'chart-of-accounts',
      label: <span><AccountBookOutlined style={{ marginRight: 6 }} />Chart of Accounts</span>,
      children: <ChartOfAccountsTab />,
    },
    {
      key: 'accounts-payable',
      label: <span><ArrowDownOutlined style={{ marginRight: 6, color: '#ff4d4f' }} />Payable</span>,
      children: <AccountsPayableTab />,
    },
    {
      key: 'accounts-receivable',
      label: <span><ArrowUpOutlined style={{ marginRight: 6, color: '#52c41a' }} />Receivable</span>,
      children: <AccountsReceivableTab />,
    },
    {
      key: 'bank-accounts',
      label: <span><BankOutlined style={{ marginRight: 6 }} />Bank Accounts</span>,
      children: <BankAccountsTab />,
    },
  ];

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--app-text)' }}>
          <FileTextOutlined style={{ marginRight: 10, color: '#1677ff' }} />
          Accounting
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--app-text-muted)', fontSize: 13 }}>
          Journal entries, payables, receivables, and bank accounts
        </p>
      </div>

      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <SummaryCard label="Total Payable" value={fmt(totalAP)} color="#ff4d4f" icon={<ArrowDownOutlined />}
            sub={`${apList.filter((r: any) => r.status === 'overdue').length} overdue`} />
        </Col>
        <Col xs={12} sm={6}>
          <SummaryCard label="Total Receivable" value={fmt(totalAR)} color="#52c41a" icon={<ArrowUpOutlined />}
            sub={`${arList.filter((r: any) => r.status === 'overdue').length} overdue`} />
        </Col>
        <Col xs={12} sm={6}>
          <SummaryCard label="Bank Balance" value={fmt(totalBank)} color="#1677ff" icon={<BankOutlined />}
            sub={`${bankList.length} account(s)`} />
        </Col>
        <Col xs={12} sm={6}>
          <SummaryCard label="Draft Entries" value={draftJE} color="#fa8c16" icon={<BookOutlined />}
            sub={`${jeList.length} total entries`} />
        </Col>
      </Row>

      <Card
        style={{
          borderRadius: 12,
          background: 'rgba(8, 25, 40, 0.72)',
          border: '1px solid rgba(134, 166, 197, 0.12)',
          boxShadow: '0 20px 50px rgba(2, 10, 19, 0.22)',
        }}
        styles={{ body: { padding: '0 20px 20px' } }}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} tabBarStyle={{ marginBottom: 20 }} />
      </Card>
    </div>
  );
}
