import { useState } from 'react';
import { Tabs, Card, Row, Col, Progress, Space, Tag } from 'antd';
import {
  BookOutlined,
  BankOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FileTextOutlined,
  AccountBookOutlined,
  SafetyCertificateOutlined,
  SignatureOutlined,
  RiseOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { accountingApi } from '@/api/accounting';
import ChartOfAccountsTab from './ChartOfAccountsTab';
import JournalEntriesTab from './JournalEntriesTab';
import AccountsPayableTab from './AccountsPayableTab';
import AccountsReceivableTab from './AccountsReceivableTab';
import BankAccountsTab from './BankAccountsTab';

function SummaryCard({
  label,
  value,
  color,
  icon,
  sub,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card
      size="small"
      style={{
        borderRadius: 18,
        border: `1px solid ${color}24`,
        background: `linear-gradient(145deg, ${color}10, rgba(8, 25, 40, 0.7))`,
        height: '100%',
      }}
      styles={{ body: { padding: '16px 18px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: `${color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: 'var(--app-text)' }}>
            {value}
          </div>
          <div style={{ fontSize: 12, color: 'var(--app-text-muted)', marginTop: 3 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--app-text-soft)', marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

function SignalCard({
  title,
  value,
  hint,
  color,
  progress,
}: {
  title: string;
  value: string;
  hint: string;
  color: string;
  progress: number;
}) {
  return (
    <Card
      size="small"
      style={{
        borderRadius: 18,
        border: '1px solid rgba(134, 166, 197, 0.12)',
        background: 'rgba(8, 25, 40, 0.62)',
        height: '100%',
      }}
      styles={{ body: { padding: 16 } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <div style={{ color: 'var(--app-text-soft)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {title}
          </div>
          <div style={{ color: 'var(--app-text)', fontSize: 22, fontWeight: 700, marginTop: 6 }}>{value}</div>
        </div>
        <Tag color="default" style={{ borderRadius: 999, paddingInline: 10 }}>{hint}</Tag>
      </div>
      <Progress
        percent={progress}
        strokeColor={color}
        trailColor="rgba(255,255,255,0.08)"
        showInfo={false}
        style={{ marginTop: 14 }}
      />
    </Card>
  );
}

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState('journal-entries');

  const { data: jeData } = useQuery({ queryKey: ['journal-entries'], queryFn: () => accountingApi.getJournalEntries().then((r) => r.data) });
  const { data: apData } = useQuery({ queryKey: ['accounts-payable'], queryFn: () => accountingApi.getAccountsPayable().then((r) => r.data) });
  const { data: arData } = useQuery({ queryKey: ['accounts-receivable'], queryFn: () => accountingApi.getAccountsReceivable().then((r) => r.data) });
  const { data: bankData } = useQuery({ queryKey: ['bank-accounts'], queryFn: () => accountingApi.getBankAccounts().then((r) => r.data) });

  const jeList = Array.isArray(jeData) ? jeData : (jeData as any)?.data || [];
  const apList = Array.isArray(apData) ? apData : (apData as any)?.data || [];
  const arList = Array.isArray(arData) ? arData : (arData as any)?.data || [];
  const bankList = Array.isArray(bankData) ? bankData : (bankData as any)?.data || [];

  const toNum = (value: unknown) => {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? 0 : numeric;
  };
  const fmt = (value: number) =>
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalAP = apList.reduce((sum: number, row: any) => sum + toNum(row.balance_amount), 0);
  const totalAR = arList.reduce((sum: number, row: any) => sum + toNum(row.balance_amount), 0);
  const totalBank = bankList.reduce((sum: number, row: any) => sum + toNum(row.current_balance), 0);
  const draftJE = jeList.filter((entry: any) => entry.status === 'draft').length;
  const postedJE = jeList.filter((entry: any) => entry.status === 'posted').length;
  const approvalQueue = arList.filter((row: any) => ['draft', 'pending_approval'].includes(row.approval_status)).length;
  const postingQueue = arList.filter((row: any) => row.approval_status === 'approved' && row.posting_status === 'unposted').length;
  const signatureQueue = arList.filter((row: any) => row.posting_status === 'posted' && row.acknowledgement_status !== 'signed').length;
  const overdueAR = arList.filter((row: any) => row.status === 'overdue').reduce((sum: number, row: any) => sum + toNum(row.balance_amount), 0);
  const overdueAP = apList.filter((row: any) => row.status === 'overdue').reduce((sum: number, row: any) => sum + toNum(row.balance_amount), 0);
  const liquidityCoverage = totalAP > 0 ? Math.min(100, Math.round((totalBank / totalAP) * 100)) : 100;
  const collectionsCoverage = totalAR > 0 ? Math.min(100, Math.round((totalBank / totalAR) * 100)) : 100;
  const postedRate = jeList.length > 0 ? Math.round((postedJE / jeList.length) * 100) : 0;

  const tabItems = [
    {
      key: 'journal-entries',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BookOutlined />
          Journal Entries
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
    <div style={{ padding: 24, minHeight: '100vh', overflowX: 'hidden' }}>
      <Card
        style={{
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(7, 31, 49, 0.96), rgba(16, 71, 92, 0.88))',
          border: '1px solid rgba(134, 166, 197, 0.14)',
          boxShadow: '0 24px 60px rgba(2, 10, 19, 0.24)',
          marginBottom: 20,
        }}
        styles={{ body: { padding: 24 } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#7dd3fc', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
              Finance Control
            </div>
            <h1 style={{ margin: '10px 0 6px', fontSize: 30, lineHeight: 1.05, color: '#f8fbff' }}>
              <FileTextOutlined style={{ marginRight: 10, color: '#86efac' }} />
              Accounting Command Center
            </h1>
            <p style={{ margin: 0, color: 'rgba(223,236,249,0.78)', maxWidth: 760, lineHeight: 1.7 }}>
              Track invoice approval queues, posting readiness, supplier exposure, bank coverage, and accounting throughput from one place.
            </p>
          </div>
          <Space wrap size={10}>
            <Tag color="green" style={{ borderRadius: 999, paddingInline: 12, paddingBlock: 4 }}>
              {approvalQueue} awaiting approval
            </Tag>
            <Tag color="blue" style={{ borderRadius: 999, paddingInline: 12, paddingBlock: 4 }}>
              {postingQueue} ready to post
            </Tag>
            <Tag color="purple" style={{ borderRadius: 999, paddingInline: 12, paddingBlock: 4 }}>
              {signatureQueue} waiting signature
            </Tag>
          </Space>
        </div>
      </Card>

      <Row gutter={[12, 12]} style={{ marginBottom: 18 }}>
        <Col xs={24} sm={12} lg={6}>
          <SummaryCard label="Receivable Exposure" value={fmt(totalAR)} color="#52c41a" icon={<ArrowUpOutlined />} sub={`${arList.filter((row: any) => row.status === 'overdue').length} overdue invoices`} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SummaryCard label="Payable Exposure" value={fmt(totalAP)} color="#ff4d4f" icon={<ArrowDownOutlined />} sub={`${apList.filter((row: any) => row.status === 'overdue').length} overdue bills`} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SummaryCard label="Bank Liquidity" value={fmt(totalBank)} color="#1677ff" icon={<WalletOutlined />} sub={`${bankList.length} bank account(s)`} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SummaryCard label="Draft Journal Entries" value={draftJE} color="#fa8c16" icon={<BookOutlined />} sub={`${postedJE} posted entries`} />
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={8}>
          <SignalCard title="Approval Queue" value={`${approvalQueue} invoices`} hint={`${signatureQueue} unsigned posted`} color="#fa8c16" progress={Math.min(100, approvalQueue * 10)} />
        </Col>
        <Col xs={24} lg={8}>
          <SignalCard title="Posting Throughput" value={`${postedRate}%`} hint={`${postingQueue} approved not posted`} color="#1677ff" progress={postedRate} />
        </Col>
        <Col xs={24} lg={8}>
          <SignalCard title="Liquidity Coverage" value={`${liquidityCoverage}%`} hint={`${fmt(overdueAP)} overdue AP`} color="#52c41a" progress={liquidityCoverage} />
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} xl={14}>
          <Card
            style={{
              borderRadius: 20,
              background: 'rgba(8, 25, 40, 0.68)',
              border: '1px solid rgba(134, 166, 197, 0.12)',
              height: '100%',
            }}
            styles={{ body: { padding: 18 } }}
          >
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: 'var(--app-text-soft)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Workflow Pressure</div>
                  <div style={{ color: 'var(--app-text)', fontSize: 20, fontWeight: 700, marginTop: 6 }}>Invoice Governance</div>
                </div>
                <Tag color="gold" style={{ borderRadius: 999, paddingInline: 12 }}>
                  {approvalQueue + postingQueue + signatureQueue} active finance tasks
                </Tag>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div style={{ padding: 14, borderRadius: 16, background: 'rgba(250, 140, 22, 0.1)', border: '1px solid rgba(250, 140, 22, 0.18)' }}>
                  <div style={{ fontSize: 12, color: 'var(--app-text-muted)' }}><SafetyCertificateOutlined /> Approval backlog</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: 'var(--app-text)' }}>{approvalQueue}</div>
                  <div style={{ fontSize: 12, color: 'var(--app-text-soft)', marginTop: 4 }}>Draft and pending invoices waiting controller action.</div>
                </div>
                <div style={{ padding: 14, borderRadius: 16, background: 'rgba(22, 119, 255, 0.1)', border: '1px solid rgba(22, 119, 255, 0.18)' }}>
                  <div style={{ fontSize: 12, color: 'var(--app-text-muted)' }}><RiseOutlined /> Posting queue</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: 'var(--app-text)' }}>{postingQueue}</div>
                  <div style={{ fontSize: 12, color: 'var(--app-text-soft)', marginTop: 4 }}>Approved invoices not yet booked to the ledger.</div>
                </div>
                <div style={{ padding: 14, borderRadius: 16, background: 'rgba(114, 46, 209, 0.1)', border: '1px solid rgba(114, 46, 209, 0.18)' }}>
                  <div style={{ fontSize: 12, color: 'var(--app-text-muted)' }}><SignatureOutlined /> Signature queue</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: 'var(--app-text)' }}>{signatureQueue}</div>
                  <div style={{ fontSize: 12, color: 'var(--app-text-soft)', marginTop: 4 }}>Posted invoices still waiting customer acknowledgement.</div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card
            style={{
              borderRadius: 20,
              background: 'rgba(8, 25, 40, 0.68)',
              border: '1px solid rgba(134, 166, 197, 0.12)',
              height: '100%',
            }}
            styles={{ body: { padding: 18 } }}
          >
            <div style={{ color: 'var(--app-text-soft)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Exposure Snapshot</div>
            <div style={{ color: 'var(--app-text)', fontSize: 20, fontWeight: 700, marginTop: 6 }}>Cash vs Obligations</div>
            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {[
                { label: 'Cash to AP coverage', value: `${liquidityCoverage}%`, sub: `${fmt(totalBank)} cash against ${fmt(totalAP)} payables` },
                { label: 'Cash to AR coverage', value: `${collectionsCoverage}%`, sub: `${fmt(totalBank)} cash against ${fmt(totalAR)} receivables` },
                { label: 'Overdue receivable risk', value: fmt(overdueAR), sub: `${arList.filter((row: any) => row.status === 'overdue').length} customer invoices overdue` },
                { label: 'Overdue payable risk', value: fmt(overdueAP), sub: `${apList.filter((row: any) => row.status === 'overdue').length} supplier bills overdue` },
              ].map((item) => (
                <div key={item.label} style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(134,166,197,0.08)' }}>
                  <div style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>{item.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--app-text)', marginTop: 6 }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--app-text-soft)', marginTop: 4 }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        style={{
          borderRadius: 20,
          background: 'rgba(8, 25, 40, 0.72)',
          border: '1px solid rgba(134, 166, 197, 0.12)',
          boxShadow: '0 20px 50px rgba(2, 10, 19, 0.22)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: '0 18px 18px' } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          tabBarStyle={{ marginBottom: 18, overflowX: 'auto' }}
        />
      </Card>
    </div>
  );
}
