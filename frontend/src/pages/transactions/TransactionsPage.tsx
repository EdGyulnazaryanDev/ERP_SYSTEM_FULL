import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Button,
  Space,
  Tag,
  Select,
  message,
} from 'antd';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import apiClient from '@/api/client';

interface Transaction {
  id: string;
  transaction_number: string;
  type: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  customer_name?: string;
  supplier_name?: string;
  transaction_date: string;
  items?: any[];
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
  topProducts: any[];
  dailySales: any[];
  monthlySales: any[];
  salesByStatus: Record<string, number>;
  salesByPaymentMethod: Record<string, number>;
}

const statusColors: Record<string, string> = {
  sale: 'green',
  purchase: 'blue',
  return: 'orange',
  adjustment: 'purple',
  transfer: 'cyan',
  draft: 'default',
  pending: 'processing',
  completed: 'success',
  cancelled: 'error',
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

export default function TransactionsPage() {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [filterType, setFilterType] = useState('all');

  // Fetch transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', dateRange, filterType],
    queryFn: async () => {
      const startDate = dateRange[0]?.format('YYYY-MM-DD');
      const endDate = dateRange[1]?.format('YYYY-MM-DD');
      const res = await apiClient.get('/transactions', {
        params: {
          startDate,
          endDate,
          type: filterType !== 'all' ? filterType : undefined,
        },
      });
      return res.data?.data || [];
    },
  });

  // Fetch analytics
  const { data: analytics = {} as AnalyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['transactions-analytics', dateRange],
    queryFn: async () => {
      const startDate = dateRange[0]?.format('YYYY-MM-DD');
      const endDate = dateRange[1]?.format('YYYY-MM-DD');
      const res = await apiClient.get('/transactions/analytics', {
        params: { startDate, endDate },
      });
      return res.data || {};
    },
  });

  // Calculate additional metrics
  const totalTransactions = transactions.length;
  const pendingAmount = transactions
    .filter((t: Transaction) => t.status === 'draft')
    .reduce((sum: number, t: Transaction) => sum + t.balance_amount, 0);

  const statusBreakdown = [
    { name: 'Draft', value: analytics?.salesByStatus?.draft || 0 },
    { name: 'Pending', value: analytics?.salesByStatus?.pending || 0 },
    { name: 'Completed', value: analytics?.salesByStatus?.completed || 0 },
    { name: 'Cancelled', value: analytics?.salesByStatus?.cancelled || 0 },
  ].filter((item) => item.value > 0);

  // Table columns
  const transactionColumns = [
    {
      title: 'Transaction #',
      dataIndex: 'transaction_number',
      key: 'transaction_number',
      width: 120,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={statusColors[type]}>{type.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Party',
      key: 'party',
      render: (_: any, record: Transaction) =>
        record.customer_name || record.supplier_name || '-',
      width: 150,
    },
    {
      title: 'Items',
      key: 'items_count',
      render: (_: any, record: Transaction) => record.items?.length || 0,
      width: 80,
    },
    {
      title: 'Total Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount: number) => `$${amount.toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: 'Paid',
      dataIndex: 'paid_amount',
      key: 'paid_amount',
      render: (amount: number) => `$${amount.toFixed(2)}`,
      align: 'right' as const,
    },
    {
      title: 'Balance',
      dataIndex: 'balance_amount',
      key: 'balance_amount',
      render: (amount: number) => (
        <span style={{ color: amount > 0 ? '#ff4d4f' : '#52c41a' }}>
          ${amount.toFixed(2)}
        </span>
      ),
      align: 'right' as const,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'transaction_date',
      key: 'transaction_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      width: 120,
    },
  ];

  const handleExport = async () => {
    try {
      message.info('Export feature coming soon');
    } catch (error) {
      message.error('Failed to export data');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
          Transactions & Analytics
        </h1>
        <Button
          icon={<DownloadOutlined />}
          onClick={handleExport}
          type="primary"
        >
          Export Report
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card style={{ marginBottom: '24px' }}>
        <Space>
          <span>Date Range:</span>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]]);
              }
            }}
          />
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: 150 }}
          >
            <Select.Option value="all">All Types</Select.Option>
            <Select.Option value="sale">Sales</Select.Option>
            <Select.Option value="purchase">Purchases</Select.Option>
            <Select.Option value="return">Returns</Select.Option>
            <Select.Option value="adjustment">Adjustments</Select.Option>
          </Select>
        </Space>
      </Card>

      {/* Key Metrics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={analyticsLoading}>
            <Statistic
              title="Total Revenue"
              value={analytics?.totalRevenue || 0}
              prefix={<DollarOutlined />}
              precision={2}
              suffix="USD"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={analyticsLoading}>
            <Statistic
              title="Total Expenses"
              value={analytics?.totalPurchases || 0}
              prefix={<DollarOutlined />}
              precision={2}
              suffix="USD"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={analyticsLoading}>
            <Statistic
              title="Profit/Loss"
              value={analytics?.totalProfit || 0}
              prefix={
                (analytics?.totalProfit || 0) >= 0 ? (
                  <ArrowUpOutlined />
                ) : (
                  <ArrowDownOutlined />
                )
              }
              precision={2}
              suffix="USD"
              valueStyle={{
                color: (analytics?.totalProfit || 0) >= 0 ? '#52c41a' : '#ff4d4f',
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={analyticsLoading}>
            <Statistic
              title="Avg Order Value"
              value={analytics?.averageOrderValue || 0}
              prefix={<DollarOutlined />}
              precision={2}
              suffix="USD"
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        {/* Daily Sales Trend */}
        <Col xs={24} lg={12}>
          <Card
            title="Daily Sales Trend"
            loading={analyticsLoading}
            style={{ height: '400px' }}
          >
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={analytics?.dailySales || []}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#8884d8"
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Monthly Sales */}
        <Col xs={24} lg={12}>
          <Card
            title="Monthly Sales"
            loading={analyticsLoading}
            style={{ height: '400px' }}
          >
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={analytics?.monthlySales || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#8884d8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        {/* Transaction Status */}
        <Col xs={24} lg={8}>
          <Card title="Transaction Status" loading={analyticsLoading}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Top Products */}
        <Col xs={24} lg={16}>
          <Card title="Top Selling Products" loading={analyticsLoading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={analytics?.topProducts?.slice(0, 10) || []}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="product_name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantity" fill="#82ca9d" />
                <Bar dataKey="revenue" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Payment Methods */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24}>
          <Card title="Payment Methods Distribution" loading={analyticsLoading}>
            <Row gutter={16}>
              {Object.entries(analytics?.salesByPaymentMethod || {}).map(
                ([method, amount]: any) => (
                  <Col xs={24} sm={12} lg={6} key={method}>
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                        {method.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                        ${amount.toFixed(2)}
                      </div>
                    </div>
                  </Col>
                ),
              )}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Transactions List */}
      <Card
        title="Transactions List"
        extra={
          <span>
            Total: {totalTransactions} | Pending: ${pendingAmount.toFixed(2)}
          </span>
        }
        loading={transactionsLoading}
      >
        <Table
          columns={transactionColumns}
          dataSource={transactions}
          rowKey="id"
          pagination={{ pageSize: 15 }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
}
