import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Tag, Tooltip, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AccountBookOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '@/api/accounting';

const accountTypes = [
  { label: 'Asset',     value: 'asset' },
  { label: 'Liability', value: 'liability' },
  { label: 'Equity',    value: 'equity' },
  { label: 'Revenue',   value: 'revenue' },
  { label: 'Expense',   value: 'expense' },
];

const TYPE_STYLE: Record<string, { color: string; bg: string }> = {
  asset:     { color: '#1677ff', bg: '#e6f4ff' },
  liability: { color: '#ff4d4f', bg: '#fff2f0' },
  equity:    { color: '#722ed1', bg: '#f9f0ff' },
  revenue:   { color: '#52c41a', bg: '#f6ffed' },
  expense:   { color: '#fa8c16', bg: '#fff7e6' },
};

const accountSubtypes: Record<string, { label: string; value: string }[]> = {
  asset: [
    { label: 'Current Asset', value: 'current_asset' },
    { label: 'Fixed Asset', value: 'fixed_asset' },
    { label: 'Cash', value: 'cash' },
    { label: 'Bank', value: 'bank' },
    { label: 'Accounts Receivable', value: 'accounts_receivable' },
    { label: 'Inventory', value: 'inventory' },
  ],
  liability: [
    { label: 'Current Liability', value: 'current_liability' },
    { label: 'Long Term Liability', value: 'long_term_liability' },
    { label: 'Accounts Payable', value: 'accounts_payable' },
  ],
  equity: [
    { label: 'Capital', value: 'capital' },
    { label: 'Retained Earnings', value: 'retained_earnings' },
  ],
  revenue: [
    { label: 'Sales Revenue', value: 'sales_revenue' },
    { label: 'Service Revenue', value: 'service_revenue' },
    { label: 'Other Income', value: 'other_income' },
  ],
  expense: [
    { label: 'Cost of Goods Sold', value: 'cost_of_goods_sold' },
    { label: 'Operating Expense', value: 'operating_expense' },
    { label: 'Administrative Expense', value: 'administrative_expense' },
  ],
};

function TypePill({ type }: { type: string }) {
  const cfg = TYPE_STYLE[type] ?? { color: '#8c8c8c', bg: '#f5f5f5' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    }}>
      {type}
    </span>
  );
}

export default function ChartOfAccountsTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => accountingApi.getAccounts().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => accountingApi.createAccount(data),
    onSuccess: () => {
      message.success('Account created');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => accountingApi.updateAccount(id, data),
    onSuccess: () => {
      message.success('Account updated');
      setIsModalVisible(false);
      setEditingRecord(null);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountingApi.deleteAccount(id),
    onSuccess: () => {
      message.success('Account deleted');
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    },
  });

  const rawData: any[] = Array.isArray(data) ? data : data?.data || [];
  const filtered = typeFilter ? rawData.filter(r => r.account_type === typeFilter) : rawData;

  const columns = [
    {
      title: 'Code',
      dataIndex: 'account_code',
      key: 'account_code',
      width: 100,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#595959' }}>{v}</span>,
    },
    {
      title: 'Account Name',
      dataIndex: 'account_name',
      key: 'account_name',
      render: (v: string, r: any) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{v}</div>
          {r.description && <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 1 }}>{r.description}</div>}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'account_type',
      key: 'account_type',
      width: 110,
      render: (t: string) => <TypePill type={t} />,
    },
    {
      title: 'Subtype',
      dataIndex: 'account_sub_type',
      key: 'account_sub_type',
      width: 160,
      render: (v: string) => v
        ? <Tag style={{ fontSize: 11 }}>{v.replace(/_/g, ' ')}</Tag>
        : <span style={{ color: '#bfbfbf' }}>—</span>,
    },
    {
      title: 'Balance',
      dataIndex: 'current_balance',
      key: 'current_balance',
      width: 120,
      align: 'right' as const,
      render: (v: number) => {
        const n = Number(v || 0);
        const color = n > 0 ? '#52c41a' : n < 0 ? '#ff4d4f' : '#8c8c8c';
        return <span style={{ fontFamily: 'monospace', fontWeight: 700, color }}>${n.toFixed(2)}</span>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      align: 'center' as const,
      render: (v: boolean) => (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '2px 8px', borderRadius: 20,
          background: v ? '#f6ffed' : '#f5f5f5',
          color: v ? '#52c41a' : '#8c8c8c',
          border: `1px solid ${v ? '#52c41a33' : '#d9d9d9'}`,
          fontSize: 11, fontWeight: 600,
        }}>
          {v ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button type="link" size="small" icon={<EditOutlined />}
              onClick={() => {
                setEditingRecord(record);
                setIsModalVisible(true);
                setSelectedType(record.account_type || '');
                setTimeout(() => form.setFieldsValue(record), 0);
              }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}
              onClick={() => Modal.confirm({
                title: 'Delete Account',
                content: 'Are you sure you want to delete this account?',
                okType: 'danger',
                onOk: () => deleteMutation.mutate(record.id),
              })}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <AccountBookOutlined style={{ color: '#1677ff', fontSize: 16 }} />
          <span style={{ fontWeight: 600, color: '#1a1a2e' }}>
            {filtered.length} account{filtered.length !== 1 ? 's' : ''}
          </span>
          <Select
            placeholder="All types"
            style={{ width: 140 }}
            value={typeFilter}
            onChange={setTypeFilter}
            allowClear
            options={accountTypes}
            size="small"
          />
        </Space>
        <Button
          type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }}
          onClick={() => { setEditingRecord(null); setIsModalVisible(true); setTimeout(() => form.resetFields(), 0); }}
        >
          Add Account
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 20, showTotal: (t) => `${t} accounts` }}
        rowClassName={(r: any) => !r.is_active ? 'row-inactive' : ''}
      />

      <Modal
        title={
          <Space>
            <AccountBookOutlined style={{ color: '#1677ff' }} />
            {editingRecord ? 'Edit Account' : 'New Account'}
          </Space>
        }
        open={isModalVisible}
        forceRender
        onCancel={() => { setIsModalVisible(false); setEditingRecord(null); setTimeout(() => form.resetFields(), 0); }}
        footer={null}
      >
        <Form
          form={form} layout="vertical"
          onFinish={(values) => {
            if (editingRecord) updateMutation.mutate({ id: editingRecord.id, data: values });
            else createMutation.mutate(values);
          }}
        >
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="account_code" label="Code" rules={[{ required: true }]}>
                <Input placeholder="e.g. 1001" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="account_name" label="Account Name" rules={[{ required: true }]}>
                <Input placeholder="e.g. Cash on Hand" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="account_type" label="Type" rules={[{ required: true }]}>
                <Select options={accountTypes} onChange={(v) => { setSelectedType(v); form.setFieldValue('account_sub_type', undefined); }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="account_sub_type" label="Subtype" rules={[{ required: true }]}>
                <Select options={accountSubtypes[selectedType] || []} allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingRecord ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`.row-inactive td { opacity: 0.55; }`}</style>
    </div>
  );
}
