import { useState } from 'react';
import {
  Card, Row, Col, Statistic, Table, DatePicker, Button, Space, Tag, Select,
  Modal, Form, Input, InputNumber, Popconfirm, message, Divider, Tooltip, Drawer,
} from 'antd';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, AreaChart, Area, Legend,
} from 'recharts';
import {
  DollarOutlined, ArrowUpOutlined, ArrowDownOutlined, PlusOutlined,
  CheckOutlined, StopOutlined, DeleteOutlined, EditOutlined,
  DownloadOutlined, EyeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import apiClient from '@/api/client';

interface TransactionItem {
  product_id: string;
  product_name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount?: number;
}

interface Transaction {
  id: string;
  transaction_number: string;
  type: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  shipping_amount?: number;
  payment_method?: string;
  customer_name?: string;
  supplier_name?: string;
  transaction_date: string;
  notes?: string;
  items?: TransactionItem[];
}

interface AnalyticsData {
  totalSales: number;
  totalPurchases: number;
  totalRevenue: number;
  totalProfit: number;
  transactionCount: number;
  salesCount: number;
  purchaseCount: number;
  averageOrderValue: number;
  topProducts: { product_name: string; quantity: number; revenue: number }[];
  dailySales: { date: string; amount: number }[];
  monthlySales: { month: string; amount: number }[];
  salesByStatus: Record<string, number>;
  salesByPaymentMethod: Record<string, number>;
}

const statusColors: Record<string, string> = {
  sale: 'green', purchase: 'blue', return: 'orange', adjustment: 'purple',
  transfer: 'cyan', draft: 'default', pending: 'processing',
  completed: 'success', cancelled: 'error',
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function TransactionsPage() {
  const qc = useQueryClient();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'), dayjs(),
  ]);
  const [filterType, setFilterType] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [form] = Form.useForm();

  // ── queries ──────────────────────────────────────────────────────────────
  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['transactions', dateRange, filterType],
    queryFn: async () => {
      const res = await apiClient.get('/transactions', {
        params: {
          startDate: dateRange[0]?.format('YYYY-MM-DD'),
          endDate: dateRange[1]?.format('YYYY-MM-DD'),
          type: filterType !== 'all' ? filterType : undefined,
        },
      });
      return res.data?.data || res.data || [];
    },
  });

  const { data: analytics = {} as AnalyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['transactions-analytics', dateRange],
    queryFn: async () => {
      const res = await apiClient.get('/transactions/analytics', {
        params: {
          startDate: dateRange[0]?.format('YYYY-MM-DD'),
          endDate: dateRange[1]?.format('YYYY-MM-DD'),
        },
      });
      return res.data || {};
    },
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory-for-tx'],
    queryFn: async () => {
      const res = await apiClient.get('/inventory');
      const d = res.data?.data || res.data || [];
      return Array.isArray(d) ? d : [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-for-tx'],
    queryFn: async () => {
      const res = await apiClient.get('/crm/customers');
      const d = res.data?.data || res.data || [];
      return Array.isArray(d) ? d : [];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-for-tx'],
    queryFn: async () => {
      const res = await apiClient.get('/suppliers');
      const d = res.data?.data || res.data || [];
      return Array.isArray(d) ? d : [];
    },
  });

  // ── mutations ─────────────────────────────────────────────────────────────
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['transactions-analytics'] });
    qc.invalidateQueries({ queryKey: ['inventory'] });
    qc.invalidateQueries({ queryKey: ['inventory-for-tx'] });
    qc.invalidateQueries({ queryKey: ['inventory-summary'] });
  };

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post('/transactions', data),
    onSuccess: () => { message.success('Transaction created'); invalidateAll(); setModalOpen(false); form.resetFields(); },
    onError: () => message.error('Failed to create transaction'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiClient.put(`/transactions/${id}`, data),
    onSuccess: () => { message.success('Transaction updated'); invalidateAll(); setModalOpen(false); form.resetFields(); setEditingTx(null); },
    onError: () => message.error('Failed to update transaction'),
  });

  const completeMut = useMutation({
    mutationFn: (id: string) => apiClient.put(`/transactions/${id}/complete`),
    onSuccess: () => { message.success('Transaction completed — inventory & accounting updated'); invalidateAll(); },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      message.error(e?.response?.data?.message || 'Failed to complete'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => apiClient.put(`/transactions/${id}/cancel`),
    onSuccess: () => { message.success('Transaction cancelled'); invalidateAll(); },
    onError: () => message.error('Failed to cancel'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/transactions/${id}`),
    onSuccess: () => { message.success('Transaction deleted'); invalidateAll(); },
    onError: () => message.error('Failed to delete'),
  });

  // ── export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const res = await apiClient.get('/transactions/export', {
        params: {
          startDate: dateRange[0]?.format('YYYY-MM-DD'),
          endDate: dateRange[1]?.format('YYYY-MM-DD'),
          type: filterType !== 'all' ? filterType : undefined,
        },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${dayjs().format('YYYY-MM-DD')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Export failed');
    }
  };

  // ── helpers ───────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingTx(null);
    form.resetFields();
    form.setFieldsValue({ items: [{}], transaction_date: dayjs().format('YYYY-MM-DD') });
    setModalOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    form.setFieldsValue({
      ...tx,
      transaction_date: tx.transaction_date?.split('T')[0],
      items: tx.items || [{}],
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingTx) {
      updateMut.mutate({ id: editingTx.id, data: values });
    } else {
      createMut.mutate(values);
    }
  };

  const txType = Form.useWatch('type', form);
  const isSale = txType === 'sale';

  // ── table columns ─────────────────────────────────────────────────────────
  const columns = [
    { title: 'Tx #', dataIndex: 'transaction_number', width: 140 },
    {
      title: 'Type', dataIndex: 'type', width: 100,
      render: (v: string) => <Tag color={statusColors[v]}>{v.toUpperCase()}</Tag>,
    },
    {
      title: 'Party', key: 'party', width: 160,
      render: (_: unknown, r: Transaction) => r.customer_name || r.supplier_name || '—',
    },
    {
      title: 'Items', key: 'items', width: 220,
      render: (_: unknown, r: Transaction) => {
        if (!r.items?.length) return <span style={{ color: '#999' }}>—</span>;
        return (
          <Space direction="vertical" size={0}>
            {r.items.slice(0, 2).map((item, i) => (
              <span key={i} style={{ fontSize: 12 }}>
                <Tag color="blue" style={{ fontSize: 11 }}>{item.quantity}×</Tag>
                {item.product_name}
                {item.sku && <span style={{ color: '#999' }}> ({item.sku})</span>}
                <span style={{ color: '#52c41a' }}> ${Number(item.unit_price).toFixed(2)}</span>
              </span>
            ))}
            {r.items.length > 2 && (
              <span style={{ fontSize: 11, color: '#1890ff', cursor: 'pointer' }}
                onClick={() => setDetailTx(r)}>
                +{r.items.length - 2} more...
              </span>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Total', dataIndex: 'total_amount', align: 'right' as const, width: 100,
      render: (v: number) => `$${Number(v).toFixed(2)}`,
    },
    {
      title: 'Balance', dataIndex: 'balance_amount', align: 'right' as const, width: 100,
      render: (v: number) => <span style={{ color: v > 0 ? '#ff4d4f' : '#52c41a' }}>${Number(v).toFixed(2)}</span>,
    },
    {
      title: 'Status', dataIndex: 'status', width: 110,
      render: (v: string) => <Tag color={statusColors[v]}>{v.toUpperCase()}</Tag>,
    },
    {
      title: 'Date', dataIndex: 'transaction_date', width: 110,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
    },
    {
      title: 'Actions', key: 'actions', width: 180,
      render: (_: unknown, r: Transaction) => (
        <Space size={4}>
          <Tooltip title="View details">
            <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailTx(r)} />
          </Tooltip>
          {r.status === 'draft' && (
            <>
              <Tooltip title="Edit">
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
              </Tooltip>
              <Tooltip title="Complete — updates inventory & accounting">
                <Popconfirm title="Complete this transaction?" onConfirm={() => completeMut.mutate(r.id)}>
                  <Button size="small" type="primary" icon={<CheckOutlined />} />
                </Popconfirm>
              </Tooltip>
              <Tooltip title="Cancel">
                <Popconfirm title="Cancel this transaction?" onConfirm={() => cancelMut.mutate(r.id)}>
                  <Button size="small" danger icon={<StopOutlined />} />
                </Popconfirm>
              </Tooltip>
              <Tooltip title="Delete">
                <Popconfirm title="Delete this transaction?" onConfirm={() => deleteMut.mutate(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Tooltip>
            </>
          )}
          {r.status === 'completed' && <Tag color="success">Completed</Tag>}
          {r.status === 'cancelled' && <Tag color="error">Cancelled</Tag>}
        </Space>
      ),
    },
  ];

  // ── chart data ────────────────────────────────────────────────────────────
  const statusBreakdown = Object.entries(analytics?.salesByStatus || {})
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  const paymentBreakdown = Object.entries(analytics?.salesByPaymentMethod || {})
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name.replace('_', ' ').toUpperCase(), value: Number(value) }));

  const topProducts = (analytics?.topProducts || []).slice(0, 8).map((p) => ({
    name: p.product_name?.length > 15 ? p.product_name.slice(0, 15) + '…' : p.product_name,
    revenue: Number(p.revenue),
    qty: p.quantity,
  }));

  const pendingAmount = (transactions as Transaction[])
    .filter(t => t.status === 'draft')
    .reduce((s, t) => s + Number(t.balance_amount), 0);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>Transactions & Analytics</h1>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>Export Excel</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Transaction</Button>
        </Space>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <span>Date Range:</span>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={dates => dates?.[0] && dates?.[1] && setDateRange([dates[0], dates[1]])}
          />
          <Select value={filterType} onChange={setFilterType} style={{ width: 150 }}>
            <Select.Option value="all">All Types</Select.Option>
            <Select.Option value="sale">Sales</Select.Option>
            <Select.Option value="purchase">Purchases</Select.Option>
            <Select.Option value="return">Returns</Select.Option>
            <Select.Option value="adjustment">Adjustments</Select.Option>
          </Select>
        </Space>
      </Card>

      {/* KPIs */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { title: 'Total Revenue', value: analytics?.totalRevenue, color: '#52c41a', icon: <DollarOutlined /> },
          { title: 'Total Expenses', value: analytics?.totalPurchases, color: '#ff4d4f', icon: <DollarOutlined /> },
          { title: 'Profit / Loss', value: analytics?.totalProfit, color: (analytics?.totalProfit || 0) >= 0 ? '#52c41a' : '#ff4d4f', icon: (analytics?.totalProfit || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined /> },
          { title: 'Avg Order Value', value: analytics?.averageOrderValue, color: '#1890ff', icon: <DollarOutlined /> },
        ].map(k => (
          <Col xs={24} sm={12} lg={6} key={k.title}>
            <Card loading={analyticsLoading}>
              <Statistic title={k.title} value={k.value || 0} prefix={k.icon} precision={2} suffix="USD" valueStyle={{ color: k.color }} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts row 1 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card title="Daily Sales Trend" loading={analyticsLoading} style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={analytics?.dailySales || []}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ReTooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'Amount']} />
                <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Status Breakdown" loading={analyticsLoading} style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusBreakdown} cx="50%" cy="50%" outerRadius={90}
                  label={({ name, value }) => `${name}: ${value}`} dataKey="value">
                  {statusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <ReTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Charts row 2 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card title="Top Products by Revenue" loading={analyticsLoading} style={{ height: 360 }}>
            {topProducts.length === 0
              ? <div style={{ textAlign: 'center', paddingTop: 80, color: '#999' }}>No completed sales yet</div>
              : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <ReTooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Revenue by Payment Method" loading={analyticsLoading} style={{ height: 360 }}>
            {paymentBreakdown.length === 0
              ? <div style={{ textAlign: 'center', paddingTop: 80, color: '#999' }}>No payment data yet</div>
              : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={paymentBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <ReTooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                    <Legend />
                    <Bar dataKey="value" name="Revenue" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card
        title="Transactions"
        extra={<span>Total: {(transactions as Transaction[]).length} | Draft balance: ${pendingAmount.toFixed(2)}</span>}
        loading={txLoading}
      >
        <Table
          columns={columns}
          dataSource={transactions as Transaction[]}
          rowKey="id"
          pagination={{ pageSize: 15 }}
          scroll={{ x: 1300 }}
        />
      </Card>

      {/* Detail Drawer */}
      <Drawer
        title={detailTx ? `Transaction: ${detailTx.transaction_number}` : ''}
        open={!!detailTx}
        onClose={() => setDetailTx(null)}
        width={560}
      >
        {detailTx && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}><strong>Type:</strong> <Tag color={statusColors[detailTx.type]}>{detailTx.type.toUpperCase()}</Tag></Col>
              <Col span={12}><strong>Status:</strong> <Tag color={statusColors[detailTx.status]}>{detailTx.status.toUpperCase()}</Tag></Col>
              <Col span={12} style={{ marginTop: 8 }}><strong>Date:</strong> {dayjs(detailTx.transaction_date).format('YYYY-MM-DD')}</Col>
              <Col span={12} style={{ marginTop: 8 }}><strong>Payment:</strong> {detailTx.payment_method || '—'}</Col>
              {detailTx.customer_name && <Col span={24} style={{ marginTop: 8 }}><strong>Customer:</strong> {detailTx.customer_name}</Col>}
              {detailTx.supplier_name && <Col span={24} style={{ marginTop: 8 }}><strong>Supplier:</strong> {detailTx.supplier_name}</Col>}
            </Row>
            <Divider>Line Items</Divider>
            <Table
              size="small"
              pagination={false}
              dataSource={detailTx.items || []}
              rowKey={(r, i) => `${r.product_id}-${i}`}
              columns={[
                { title: 'Product', dataIndex: 'product_name', render: (v, r) => <span>{v}<br/><small style={{ color: '#999' }}>{r.sku}</small></span> },
                { title: 'Qty', dataIndex: 'quantity', width: 60, align: 'right' as const },
                { title: 'Price', dataIndex: 'unit_price', width: 80, align: 'right' as const, render: (v: number) => `$${Number(v).toFixed(2)}` },
                { title: 'Total', dataIndex: 'total_amount', width: 90, align: 'right' as const, render: (v: number) => `$${Number(v).toFixed(2)}` },
              ]}
            />
            <Divider />
            <Row gutter={8}>
              <Col span={12}><strong>Subtotal:</strong></Col><Col span={12} style={{ textAlign: 'right' }}>${Number(detailTx.subtotal || 0).toFixed(2)}</Col>
              <Col span={12}><strong>Tax:</strong></Col><Col span={12} style={{ textAlign: 'right' }}>${Number(detailTx.tax_amount || 0).toFixed(2)}</Col>
              <Col span={12}><strong>Discount:</strong></Col><Col span={12} style={{ textAlign: 'right' }}>-${Number(detailTx.discount_amount || 0).toFixed(2)}</Col>
              <Col span={12}><strong>Shipping:</strong></Col><Col span={12} style={{ textAlign: 'right' }}>${Number(detailTx.shipping_amount || 0).toFixed(2)}</Col>
              <Col span={12}><strong>Total:</strong></Col><Col span={12} style={{ textAlign: 'right', fontWeight: 'bold' }}>${Number(detailTx.total_amount).toFixed(2)}</Col>
              <Col span={12}><strong>Paid:</strong></Col><Col span={12} style={{ textAlign: 'right', color: '#52c41a' }}>${Number(detailTx.paid_amount).toFixed(2)}</Col>
              <Col span={12}><strong>Balance:</strong></Col><Col span={12} style={{ textAlign: 'right', color: detailTx.balance_amount > 0 ? '#ff4d4f' : '#52c41a' }}>${Number(detailTx.balance_amount).toFixed(2)}</Col>
            </Row>
            {detailTx.notes && <><Divider /><p><strong>Notes:</strong> {detailTx.notes}</p></>}
          </div>
        )}
      </Drawer>

      {/* Create / Edit Modal */}
      <Modal
        title={editingTx ? `Edit ${editingTx.transaction_number}` : 'New Transaction'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingTx(null); form.resetFields(); }}
        onOk={handleSubmit}
        confirmLoading={createMut.isPending || updateMut.isPending}
        width={820}
        okText={editingTx ? 'Save' : 'Create'}
      >
        <Form form={form} layout="vertical" size="small">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="sale">Sale</Select.Option>
                  <Select.Option value="purchase">Purchase</Select.Option>
                  <Select.Option value="return">Return</Select.Option>
                  <Select.Option value="adjustment">Adjustment</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="transaction_date" label="Date" rules={[{ required: true }]}>
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="payment_method" label="Payment Method">
                <Select allowClear>
                  <Select.Option value="cash">Cash</Select.Option>
                  <Select.Option value="card">Card</Select.Option>
                  <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
                  <Select.Option value="check">Check</Select.Option>
                  <Select.Option value="credit">Credit</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            {isSale ? (
              <>
                <Col span={12}>
                  <Form.Item name="customer_id" label="Customer">
                    <Select showSearch allowClear optionFilterProp="children"
                      onChange={(val) => {
                        const c = (customers as { id: string; company_name?: string; name?: string }[]).find(x => x.id === val);
                        if (c) form.setFieldValue('customer_name', c.company_name || c.name);
                      }}>
                      {(customers as { id: string; company_name?: string; name?: string }[]).map(c => (
                        <Select.Option key={c.id} value={c.id}>{c.company_name || c.name}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="customer_name" label="Customer Name"><Input /></Form.Item>
                </Col>
              </>
            ) : (
              <>
                <Col span={12}>
                  <Form.Item name="supplier_id" label="Supplier">
                    <Select showSearch allowClear optionFilterProp="children"
                      onChange={(val) => {
                        const s = (suppliers as { id: string; name: string }[]).find(x => x.id === val);
                        if (s) form.setFieldValue('supplier_name', s.name);
                      }}>
                      {(suppliers as { id: string; name: string }[]).map(s => (
                        <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="supplier_name" label="Supplier Name"><Input /></Form.Item>
                </Col>
              </>
            )}
          </Row>

          <Row gutter={12}>
            <Col span={6}><Form.Item name="tax_rate" label="Tax Rate (%)"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="discount_amount" label="Discount ($)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="shipping_amount" label="Shipping ($)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item name="paid_amount" label="Paid ($)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider>Line Items</Divider>

          <Form.List name="items" rules={[{ validator: async (_, v) => !v?.length && Promise.reject('Add at least one item') }]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Row gutter={8} key={key} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={7}>
                      <Form.Item name={[name, 'product_id']} noStyle rules={[{ required: true, message: 'Product required' }]}>
                        <Select showSearch placeholder="Product" optionFilterProp="children" style={{ width: '100%' }}
                          onChange={(val) => {
                            const inv = (inventory as { id: string; product_name: string; sku: string; unit_price: number; unit_cost: number }[]).find(i => i.id === val);
                            if (inv) {
                              const items = form.getFieldValue('items');
                              items[name] = { ...items[name], product_id: val, product_name: inv.product_name, sku: inv.sku, unit_price: isSale ? Number(inv.unit_price) : Number(inv.unit_cost) };
                              form.setFieldValue('items', items);
                            }
                          }}>
                          {(inventory as { id: string; product_name: string; sku: string; available_quantity: number }[]).map(i => (
                            <Select.Option key={i.id} value={i.id}>{i.product_name} <span style={{ color: '#999' }}>({i.sku}) stock:{i.available_quantity}</span></Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item name={[name, 'quantity']} noStyle rules={[{ required: true }]}>
                        <InputNumber placeholder="Qty" min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item name={[name, 'unit_price']} noStyle rules={[{ required: true }]}>
                        <InputNumber placeholder="Unit Price" min={0} style={{ width: '100%' }} prefix="$" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item name={[name, 'discount_amount']} noStyle>
                        <InputNumber placeholder="Discount" min={0} style={{ width: '100%' }} prefix="$" />
                      </Form.Item>
                    </Col>
                    <Col span={3}>
                      <Form.Item name={[name, 'product_name']} noStyle><Input type="hidden" /></Form.Item>
                      <Form.Item name={[name, 'sku']} noStyle><Input type="hidden" /></Form.Item>
                    </Col>
                    <Col span={1}>
                      <Button danger size="small" onClick={() => remove(name)}>✕</Button>
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>Add Item</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
