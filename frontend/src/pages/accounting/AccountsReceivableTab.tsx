import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Select, Row, Col, Alert, Tooltip } from 'antd';
import { PlusOutlined, ArrowUpOutlined, DollarOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '@/api/accounting';
import { crmApi } from '@/api/crm';
import dayjs from 'dayjs';

const STATUS_CFG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  open:           { color: '#fa8c16', bg: '#fff7e6', icon: <ClockCircleOutlined />,       label: 'OPEN' },
  partially_paid: { color: '#1677ff', bg: '#e6f4ff', icon: <DollarOutlined />,            label: 'PARTIAL' },
  paid:           { color: '#52c41a', bg: '#f6ffed', icon: <CheckCircleOutlined />,       label: 'PAID' },
  overdue:        { color: '#ff4d4f', bg: '#fff2f0', icon: <ExclamationCircleOutlined />, label: 'OVERDUE' },
  written_off:    { color: '#8fa3b8', bg: 'rgba(255,255,255,0.04)', icon: <CloseCircleOutlined />, label: 'WRITTEN OFF' },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { color: 'var(--app-text-muted)', bg: 'rgba(255,255,255,0.04)', icon: null, label: (status || '').toUpperCase() };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function AccountsReceivableTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data, isLoading } = useQuery({
    queryKey: ['accounts-receivable'],
    queryFn: () => accountingApi.getAccountsReceivable().then(res => res.data),
  });

  const { data: customersRaw = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => crmApi.getCustomers().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => accountingApi.createAR(d),
    onSuccess: () => {
      message.success('Invoice created');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create invoice'),
  });

  const customerList = Array.isArray(customersRaw) ? customersRaw : (customersRaw as any)?.data || [];
  const customerOptions = customerList.map((c: any) => ({
    label: c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.name || c.id,
    value: c.id,
  }));

  const rawList: any[] = Array.isArray(data) ? data : (data as any)?.data || [];
  const filtered = statusFilter ? rawList.filter(r => r.status === statusFilter) : rawList;
  const overdueCount = rawList.filter(r => r.status === 'overdue').length;
  const totalBalance = rawList.reduce((s, r) => s + Number(r.balance_amount || 0), 0);

  const columns = [
    {
      title: 'Invoice #', dataIndex: 'invoice_number', key: 'invoice_number', width: 140,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{v}</span>,
    },
    {
      title: 'Customer', key: 'customer',
      render: (_: any, r: any) => (
        <span style={{ fontWeight: 500 }}>{r.customer_name || r.customer?.company_name || r.customer?.first_name || r.customer_id || '—'}</span>
      ),
    },
    {
      title: 'Invoice Date', dataIndex: 'invoice_date', key: 'invoice_date', width: 120,
      render: (d: string) => d ? <span style={{ fontSize: 12 }}>{dayjs(d).format('MMM DD, YYYY')}</span> : '—',
    },
    {
      title: 'Due Date', dataIndex: 'due_date', key: 'due_date', width: 120,
      render: (d: string, r: any) => {
        if (!d) return '—';
        const isLate = r.status !== 'paid' && dayjs(d).isBefore(dayjs());
        return (
          <span style={{ fontSize: 12, color: isLate ? '#ff4d4f' : 'var(--app-text-muted)', fontWeight: isLate ? 600 : 400 }}>
            {isLate && '⚠ '}{dayjs(d).format('MMM DD, YYYY')}
          </span>
        );
      },
    },
    {
      title: 'Total', dataIndex: 'total_amount', key: 'total_amount', width: 110, align: 'right' as const,
      render: (v: any) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>${Number(v || 0).toFixed(2)}</span>,
    },
    {
      title: 'Paid', dataIndex: 'paid_amount', key: 'paid_amount', width: 100, align: 'right' as const,
      render: (v: any) => <span style={{ fontFamily: 'monospace', color: '#52c41a', fontSize: 12 }}>${Number(v || 0).toFixed(2)}</span>,
    },
    {
      title: 'Balance', dataIndex: 'balance_amount', key: 'balance_amount', width: 110, align: 'right' as const,
      render: (v: any) => {
        const n = Number(v || 0);
        return <span style={{ fontFamily: 'monospace', fontWeight: 700, color: n > 0 ? '#1677ff' : '#52c41a', fontSize: 12 }}>${n.toFixed(2)}</span>;
      },
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 120,
      render: (s: string) => <StatusPill status={s} />,
    },
  ];

  const handleSubmit = (values: any) => {
    createMutation.mutate({
      customer_id: values.customer_id,
      invoice_number: values.invoice_number,
      invoice_date: values.invoice_date ? values.invoice_date.format('YYYY-MM-DD') : null,
      due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
      amount: Number(values.amount),
      description: values.description,
    });
  };

  return (
    <div>
      {/* Summary strip */}
      {rawList.length > 0 && (
        <div style={{
          display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap',
        }}>
          {[
            { label: 'Total Invoiced', value: rawList.reduce((s, r) => s + Number(r.total_amount || 0), 0), color: '#1677ff' },
            { label: 'Total Collected', value: rawList.reduce((s, r) => s + Number(r.paid_amount || 0), 0), color: '#52c41a' },
            { label: 'Outstanding', value: totalBalance, color: totalBalance > 0 ? '#fa8c16' : '#52c41a' },
            { label: 'Overdue', value: rawList.filter(r => r.status === 'overdue').reduce((s, r) => s + Number(r.balance_amount || 0), 0), color: '#ff4d4f' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              flex: '1 1 140px', padding: '10px 16px', borderRadius: 10,
              background: `linear-gradient(135deg, ${color}14 0%, rgba(8, 25, 40, 0.58) 100%)`,
              border: `1px solid ${color}22`,
            }}>
              <div style={{ fontSize: 11, color: 'var(--app-text-muted)' }}>{label}</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color }}>
                ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      )}

      {overdueCount > 0 && (
        <Alert
          message={`${overdueCount} overdue invoice(s) — total outstanding: $${totalBalance.toFixed(2)}`}
          type="warning" showIcon style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <ArrowUpOutlined style={{ color: '#52c41a', fontSize: 16 }} />
          <span style={{ fontWeight: 600, color: 'var(--app-text)' }}>{filtered.length} invoices</span>
          <Select
            placeholder="All statuses" style={{ width: 150 }} value={statusFilter}
            onChange={setStatusFilter} allowClear size="small"
            options={Object.entries(STATUS_CFG).map(([v, c]) => ({ label: c.label, value: v }))}
          />
        </Space>
        <Space>
          <Tooltip title="Refresh">
            <Button icon={<ReloadOutlined />} size="small"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] })} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }}
            onClick={() => { setIsModalVisible(true); form.resetFields(); }}>
            Add Invoice
          </Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={filtered} loading={isLoading} rowKey="id" size="small"
        pagination={{ pageSize: 15, showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}` }}
        rowClassName={(r: any) => r.status === 'overdue' ? 'row-overdue' : r.status === 'paid' ? 'row-paid' : ''}
      />

      <Modal title={<Space><ArrowUpOutlined style={{ color: '#52c41a' }} />Add Invoice</Space>}
        open={isModalVisible} onCancel={() => { setIsModalVisible(false); form.resetFields(); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="customer_id" label="Customer" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" placeholder="Select customer" options={customerOptions} />
          </Form.Item>
          <Form.Item name="invoice_number" label="Invoice Number" rules={[{ required: true }]}>
            <Input placeholder="e.g. INV-001" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="invoice_date" label="Invoice Date" rules={[{ required: true }]} initialValue={dayjs()}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="due_date" label="Due Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <Input type="number" min={0} step="0.01" prefix="$" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>Create</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-overdue td { background: rgba(255,77,79,0.10) !important; }
        .row-paid td { background: rgba(82,196,26,0.10) !important; }
      `}</style>
    </div>
  );
}
