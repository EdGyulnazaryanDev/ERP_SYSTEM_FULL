import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select, Row, Col, Tooltip } from 'antd';
import { PlusOutlined, EyeOutlined, BookOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '@/api/accounting';
import dayjs from 'dayjs';

const ENTRY_TYPES = [
  { label: 'General',    value: 'general' },
  { label: 'Sales',      value: 'sales' },
  { label: 'Purchase',   value: 'purchase' },
  { label: 'Payment',    value: 'payment' },
  { label: 'Receipt',    value: 'receipt' },
  { label: 'Adjustment', value: 'adjustment' },
];

const STATUS_CFG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  draft:    { color: '#fa8c16', bg: '#fff7e6', icon: <ClockCircleOutlined />,  label: 'DRAFT' },
  posted:   { color: '#52c41a', bg: '#f6ffed', icon: <CheckCircleOutlined />,  label: 'POSTED' },
  reversed: { color: '#ff4d4f', bg: '#fff2f0', icon: <CloseCircleOutlined />,  label: 'REVERSED' },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { color: '#8c8c8c', bg: '#f5f5f5', icon: null, label: status?.toUpperCase() };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      fontSize: 11, fontWeight: 600,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function JournalEntriesTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [viewRecord, setViewRecord] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: () => accountingApi.getJournalEntries().then(res => res.data),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => accountingApi.getAccounts().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => accountingApi.createJournalEntry(data),
    onSuccess: () => {
      message.success('Journal entry created');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create entry'),
  });

  const handleSubmit = (values: any) => {
    createMutation.mutate({
      entry_date: values.entry_date ? values.entry_date.format('YYYY-MM-DD') : null,
      entry_type: values.entry_type || 'general',
      description: values.description,
      reference: values.reference,
      lines: [
        { account_id: values.debit_account_id,  description: values.description, debit: Number(values.amount), credit: 0 },
        { account_id: values.credit_account_id, description: values.description, debit: 0, credit: Number(values.amount) },
      ],
    });
  };

  const accountOptions = (Array.isArray(accounts) ? accounts : accounts?.data || [])
    .map((a: any) => ({ label: `${a.account_code} — ${a.account_name}`, value: a.id }));

  const rawList: any[] = Array.isArray(data) ? data : data?.data || [];
  const filtered = statusFilter ? rawList.filter(r => r.status === statusFilter) : rawList;

  const columns = [
    {
      title: 'Entry #',
      dataIndex: 'entry_number',
      key: 'entry_number',
      width: 150,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{v}</span>,
    },
    {
      title: 'Date',
      dataIndex: 'entry_date',
      key: 'entry_date',
      width: 110,
      render: (d: string) => d ? <span style={{ fontSize: 12 }}>{dayjs(d).format('MMM DD, YYYY')}</span> : '—',
    },
    {
      title: 'Type',
      dataIndex: 'entry_type',
      key: 'entry_type',
      width: 100,
      render: (v: string) => <Tag style={{ fontSize: 11 }}>{v}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (v: string) => <span style={{ color: '#595959', fontSize: 12 }}>{v || '—'}</span>,
    },
    {
      title: 'Debit',
      dataIndex: 'total_debit',
      key: 'total_debit',
      width: 110,
      align: 'right' as const,
      render: (v: number) => v != null
        ? <span style={{ fontFamily: 'monospace', color: '#ff4d4f', fontWeight: 600 }}>${Number(v).toFixed(2)}</span>
        : '—',
    },
    {
      title: 'Credit',
      dataIndex: 'total_credit',
      key: 'total_credit',
      width: 110,
      align: 'right' as const,
      render: (v: number) => v != null
        ? <span style={{ fontFamily: 'monospace', color: '#52c41a', fontWeight: 600 }}>${Number(v).toFixed(2)}</span>
        : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: string) => <StatusPill status={s} />,
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Tooltip title="View details">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setViewRecord(record)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <BookOutlined style={{ color: '#1677ff', fontSize: 16 }} />
          <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{filtered.length} entries</span>
          <Select
            placeholder="All statuses"
            style={{ width: 140 }}
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            size="small"
            options={[
              { label: 'Draft',    value: 'draft' },
              { label: 'Posted',   value: 'posted' },
              { label: 'Reversed', value: 'reversed' },
            ]}
          />
        </Space>
        <Button
          type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }}
          onClick={() => { setIsModalVisible(true); form.resetFields(); }}
        >
          New Entry
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 15, showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}` }}
        rowClassName={(r: any) => r.status === 'draft' ? 'row-draft' : r.status === 'reversed' ? 'row-reversed' : ''}
      />

      {/* Create modal */}
      <Modal
        title={<Space><BookOutlined style={{ color: '#1677ff' }} />New Journal Entry</Space>}
        open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="entry_date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} defaultValue={dayjs()} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="entry_type" label="Type" initialValue="general">
                <Select options={ENTRY_TYPES} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="reference" label="Reference">
                <Input placeholder="e.g. INV-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                <Input type="number" min={0} prefix="$" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="debit_account_id" label="Debit Account" rules={[{ required: true }]}>
            <Select options={accountOptions} showSearch optionFilterProp="label" placeholder="Account to debit" />
          </Form.Item>
          <Form.Item name="credit_account_id" label="Credit Account" rules={[{ required: true }]}>
            <Select options={accountOptions} showSearch optionFilterProp="label" placeholder="Account to credit" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>Create</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: '#1677ff' }} />
            <span style={{ fontFamily: 'monospace' }}>{viewRecord?.entry_number}</span>
            {viewRecord && <StatusPill status={viewRecord.status} />}
          </Space>
        }
        open={!!viewRecord}
        onCancel={() => setViewRecord(null)}
        footer={null}
        width={600}
      >
        {viewRecord && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>Date</div>
                <div style={{ fontWeight: 600 }}>{dayjs(viewRecord.entry_date).format('MMM DD, YYYY')}</div>
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>Type</div>
                <Tag style={{ marginTop: 2 }}>{viewRecord.entry_type}</Tag>
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>Reference</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{viewRecord.reference || '—'}</div>
              </Col>
            </Row>
            {viewRecord.description && (
              <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fafafa', borderRadius: 8, fontSize: 13, color: '#595959' }}>
                {viewRecord.description}
              </div>
            )}
            <Table
              size="small"
              pagination={false}
              dataSource={viewRecord.lines || []}
              rowKey="id"
              columns={[
                {
                  title: 'Account',
                  render: (_: any, r: any) => (
                    <span style={{ fontWeight: 500 }}>{r.account?.account_name || r.account_id}</span>
                  ),
                },
                {
                  title: 'Debit',
                  dataIndex: 'debit',
                  width: 110,
                  align: 'right' as const,
                  render: (v: number) => v > 0
                    ? <span style={{ fontFamily: 'monospace', color: '#ff4d4f', fontWeight: 600 }}>${Number(v).toFixed(2)}</span>
                    : <span style={{ color: '#bfbfbf' }}>—</span>,
                },
                {
                  title: 'Credit',
                  dataIndex: 'credit',
                  width: 110,
                  align: 'right' as const,
                  render: (v: number) => v > 0
                    ? <span style={{ fontFamily: 'monospace', color: '#52c41a', fontWeight: 600 }}>${Number(v).toFixed(2)}</span>
                    : <span style={{ color: '#bfbfbf' }}>—</span>,
                },
              ]}
              summary={(rows) => {
                const totalDebit  = rows.reduce((s, r: any) => s + Number(r.debit  || 0), 0);
                const totalCredit = rows.reduce((s, r: any) => s + Number(r.credit || 0), 0);
                return (
                  <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 700 }}>
                    <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <span style={{ fontFamily: 'monospace', color: '#ff4d4f' }}>${totalDebit.toFixed(2)}</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <span style={{ fontFamily: 'monospace', color: '#52c41a' }}>${totalCredit.toFixed(2)}</span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />
          </div>
        )}
      </Modal>

      <style>{`
        .row-draft td { background: #fffbe6 !important; }
        .row-reversed td { background: #fff2f0 !important; opacity: 0.7; }
      `}</style>
    </div>
  );
}
