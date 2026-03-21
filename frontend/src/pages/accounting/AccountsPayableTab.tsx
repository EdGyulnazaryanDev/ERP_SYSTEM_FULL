import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Select, Row, Col, Alert, Tooltip, InputNumber } from 'antd';
import { PlusOutlined, ArrowDownOutlined, DollarOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '@/api/accounting';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

const STATUS_CFG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  open:           { color: '#fa8c16', bg: '#fff7e6', icon: <ClockCircleOutlined />,       label: 'OPEN' },
  partially_paid: { color: '#1677ff', bg: '#e6f4ff', icon: <DollarOutlined />,            label: 'PARTIAL' },
  paid:           { color: '#52c41a', bg: '#f6ffed', icon: <CheckCircleOutlined />,       label: 'PAID' },
  overdue:        { color: '#ff4d4f', bg: '#fff2f0', icon: <ExclamationCircleOutlined />, label: 'OVERDUE' },
  cancelled:      { color: '#8c8c8c', bg: '#f5f5f5', icon: <CloseCircleOutlined />,       label: 'CANCELLED' },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { color: '#8c8c8c', bg: '#f5f5f5', icon: null, label: (status || '').toUpperCase() };
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

export default function AccountsPayableTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [payForm] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [payRecord, setPayRecord] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['accounts-payable'],
    queryFn: () => accountingApi.getAccountsPayable().then(res => res.data),
  });

  const { data: suppliersRaw, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => apiClient.get('/suppliers?pageSize=200').then(res => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => accountingApi.createAP(d),
    onSuccess: () => {
      message.success('Bill created');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create bill'),
  });

  const payMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      accountingApi.recordAPPayment(id, data),
    onSuccess: () => {
      message.success('Payment recorded — journal entry created');
      setPayRecord(null);
      payForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to record payment'),
  });

  const supplierList = Array.isArray(suppliersRaw) ? suppliersRaw : suppliersRaw?.data || [];
  const supplierOptions = supplierList.map((s: any) => ({ label: s.name || s.id, value: s.id }));

  const rawList: any[] = Array.isArray(data) ? data : (data as any)?.data || [];
  const filtered = statusFilter ? rawList.filter(r => r.status === statusFilter) : rawList;
  const overdueCount   = rawList.filter(r => r.status === 'overdue').length;
  const totalBalance   = rawList.reduce((s, r) => s + Number(r.balance_amount || 0), 0);
  const totalBilled    = rawList.reduce((s, r) => s + Number(r.total_amount   || 0), 0);
  const totalPaid      = rawList.reduce((s, r) => s + Number(r.paid_amount    || 0), 0);
  const totalOverdue   = rawList.filter(r => r.status === 'overdue').reduce((s, r) => s + Number(r.balance_amount || 0), 0);

  const fmt = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const columns = [
    {
      title: 'Bill #', dataIndex: 'bill_number', key: 'bill_number', width: 140,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{v}</span>,
    },
    {
      title: 'Supplier', key: 'supplier',
      render: (_: any, r: any) => (
        <span style={{ fontWeight: 500 }}>{r.supplier_name || r.supplier?.name || '—'}</span>
      ),
    },
    {
      title: 'Bill Date', dataIndex: 'bill_date', key: 'bill_date', width: 120,
      render: (d: string) => d ? <span style={{ fontSize: 12 }}>{dayjs(d).format('MMM DD, YYYY')}</span> : '—',
    },
    {
      title: 'Due Date', dataIndex: 'due_date', key: 'due_date', width: 120,
      render: (d: string, r: any) => {
        if (!d) return '—';
        const isLate = r.status !== 'paid' && dayjs(d).isBefore(dayjs());
        return (
          <span style={{ fontSize: 12, color: isLate ? '#ff4d4f' : '#595959', fontWeight: isLate ? 600 : 400 }}>
            {isLate && '⚠ '}{dayjs(d).format('MMM DD, YYYY')}
          </span>
        );
      },
    },
    {
      title: 'Total', dataIndex: 'total_amount', key: 'total_amount', width: 110, align: 'right' as const,
      render: (v: any) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{fmt(Number(v || 0))}</span>,
    },
    {
      title: 'Paid', dataIndex: 'paid_amount', key: 'paid_amount', width: 100, align: 'right' as const,
      render: (v: any) => <span style={{ fontFamily: 'monospace', color: '#52c41a', fontSize: 12 }}>{fmt(Number(v || 0))}</span>,
    },
    {
      title: 'Balance', dataIndex: 'balance_amount', key: 'balance_amount', width: 110, align: 'right' as const,
      render: (v: any) => {
        const n = Number(v || 0);
        return <span style={{ fontFamily: 'monospace', fontWeight: 700, color: n > 0 ? '#ff4d4f' : '#52c41a', fontSize: 12 }}>{fmt(n)}</span>;
      },
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 130,
      render: (s: string) => <StatusPill status={s} />,
    },
    {
      title: 'Action', key: 'action', width: 120, align: 'center' as const,
      render: (_: any, r: any) => {
        if (r.status === 'paid' || r.status === 'cancelled') return null;
        return (
          <Tooltip title="Record payment">
            <Button
              size="small" type="primary" icon={<DollarOutlined />}
              style={{ borderRadius: 6 }}
              onClick={() => { setPayRecord(r); payForm.setFieldsValue({ payment_date: dayjs(), payment_amount: Number(r.balance_amount) }); }}
            >
              Pay
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div>
      {/* Summary strip */}
      {rawList.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Billed',   value: totalBilled,  color: '#1677ff' },
            { label: 'Total Paid',     value: totalPaid,    color: '#52c41a' },
            { label: 'Outstanding',    value: totalBalance, color: totalBalance > 0 ? '#fa8c16' : '#52c41a' },
            { label: 'Overdue',        value: totalOverdue, color: '#ff4d4f' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              flex: '1 1 140px', padding: '10px 16px', borderRadius: 10,
              background: `${color}08`, border: `1px solid ${color}22`,
            }}>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>{label}</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color }}>{fmt(value)}</div>
            </div>
          ))}
        </div>
      )}

      {overdueCount > 0 && (
        <Alert
          message={`${overdueCount} overdue bill(s) — click "Pay" on any row to record a payment and clear the balance`}
          type="warning" showIcon style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <ArrowDownOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
          <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{filtered.length} bills</span>
          <Select
            placeholder="All statuses" style={{ width: 150 }} value={statusFilter}
            onChange={setStatusFilter} allowClear size="small"
            options={Object.entries(STATUS_CFG).map(([v, c]) => ({ label: c.label, value: v }))}
          />
        </Space>
        <Space>
          <Tooltip title="Refresh">
            <Button icon={<ReloadOutlined />} size="small"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['accounts-payable'] })} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }}
            onClick={() => { setIsModalVisible(true); form.resetFields(); }}>
            Add Bill
          </Button>
        </Space>
      </div>

      <Table columns={columns} dataSource={filtered} loading={isLoading} rowKey="id" size="small"
        scroll={{ x: 1050 }}
        pagination={{ pageSize: 15, showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}` }}
        rowClassName={(r: any) => r.status === 'overdue' ? 'row-overdue' : r.status === 'paid' ? 'row-paid' : ''}
      />

      {/* Add Bill Modal */}
      <Modal title={<Space><ArrowDownOutlined style={{ color: '#ff4d4f' }} />Add Bill</Space>}
        open={isModalVisible} onCancel={() => { setIsModalVisible(false); form.resetFields(); }} footer={null}>
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate({
          supplier_id: values.supplier_id,
          bill_number: values.bill_number,
          bill_date: values.bill_date ? values.bill_date.format('YYYY-MM-DD') : null,
          due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
          amount: Number(values.amount),
          description: values.description,
        })}>
          <Form.Item name="supplier_id" label="Supplier" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" placeholder={suppliersLoading ? 'Loading…' : 'Select supplier'}
              options={supplierOptions} loading={suppliersLoading} />
          </Form.Item>
          <Form.Item name="bill_number" label="Bill Number" rules={[{ required: true }]}>
            <Input placeholder="e.g. BILL-001" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="bill_date" label="Bill Date" rules={[{ required: true }]} initialValue={dayjs()}>
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

      {/* Record Payment Modal */}
      <Modal
        title={
          <Space>
            <DollarOutlined style={{ color: '#1677ff' }} />
            Record Payment — <span style={{ fontFamily: 'monospace' }}>{payRecord?.bill_number}</span>
          </Space>
        }
        open={!!payRecord}
        onCancel={() => { setPayRecord(null); payForm.resetFields(); }}
        footer={null}
        width={440}
      >
        {payRecord && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: '#fff7e6', border: '1px solid #fa8c1633' }}>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>Supplier</div>
                <div style={{ fontWeight: 600 }}>{payRecord.supplier_name || '—'}</div>
              </div>
              <div style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: '#fff2f0', border: '1px solid #ff4d4f33' }}>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>Balance Due</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color: '#ff4d4f' }}>{fmt(Number(payRecord.balance_amount))}</div>
              </div>
            </div>
            <Form form={payForm} layout="vertical"
              onFinish={(values) => payMutation.mutate({
                id: payRecord.id,
                data: {
                  payment_amount: Number(values.payment_amount),
                  payment_date: values.payment_date ? values.payment_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
                  reference: values.reference,
                  notes: values.notes,
                },
              })}
            >
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="payment_amount" label="Payment Amount" rules={[{ required: true }]}>
                    <InputNumber min={0.01} max={Number(payRecord.balance_amount)} step={0.01} prefix="$" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="payment_date" label="Payment Date" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="reference" label="Reference">
                <Input placeholder="e.g. CHQ-001" />
              </Form.Item>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Alert type="info" showIcon style={{ marginBottom: 12, borderRadius: 8 }}
                message="Recording this payment will automatically create a Journal Entry: Debit Accounts Payable → Credit Bank/Cash." />
              <Form.Item style={{ marginBottom: 0 }}>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button onClick={() => { setPayRecord(null); payForm.resetFields(); }}>Cancel</Button>
                  <Button type="primary" htmlType="submit" loading={payMutation.isPending}
                    icon={<CheckCircleOutlined />}>
                    Confirm Payment
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      <style>{`
        .row-overdue td { background: #fff2f0 !important; }
        .row-paid td { background: #f6ffed !important; }
      `}</style>
    </div>
  );
}
