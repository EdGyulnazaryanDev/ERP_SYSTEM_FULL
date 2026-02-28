import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Select,
  Space,
  Spin,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  RiseOutlined,
} from '@ant-design/icons';
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
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { transactionsApi } from '@/api/transactions';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function TransactionAnalyticsPage() {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['transaction-analytics', dateRange],
    queryFn: async () => {
      const response = await transactionsApi.getAnalytics(
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      );
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  const profitMargin = analytics?.totalRevenue
    ? ((analytics.totalProfit / analytics.totalRevenue) * 100).toFixed(2)
    : 0;

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Header with Date Range Selector */}
        <Card>
          <Row justify="space-between" align="middle">
            <Col>
              <h2 style={{ margin: 0 }}>Transaction Analytics Dashboard</h2>
            </Col>
            <Col>
              <Space>
                <Select
                  defaultValue="30"
                  style={{ width: 150 }}
                  onChange={(value) => {
                    const days = parseInt(value);
                    setDateRange([dayjs().subtract(days, 'days'), dayjs()]);
                  }}
                >
                  <Select.Option value="7">Last 7 Days</Select.Option>
                  <Select.Option value="30">Last 30 Days</Select.Option>
                  <Select.Option value="90">Last 90 Days</Select.Option>
                  <Select.Option value="365">Last Year</Select.Option>
                </Select>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
                />
              </Space>
            </Col>
          </Row>
        </Card>

        {/* KPI Cards */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Revenue"
                value={analytics?.totalRevenue || 0}
                precision={2}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Sales"
                value={analytics?.totalSales || 0}
                precision={2}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Purchases"
                value={analytics?.totalPurchases || 0}
                precision={2}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Net Profit"
                value={analytics?.totalProfit || 0}
                precision={2}
                prefix={<RiseOutlined />}
                suffix={`(${profitMargin}%)`}
                valueStyle={{ color: (analytics?.totalProfit || 0) >= 0 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Transaction Counts */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Transactions"
                value={analytics?.transactionCount || 0}
                prefix={<SwapOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Sales Count"
                value={analytics?.salesCount || 0}
                prefix={<ShoppingCartOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Purchase Count"
                value={analytics?.purchaseCount || 0}
                prefix={<ShoppingCartOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Average Order Value"
                value={analytics?.averageOrderValue || 0}
                precision={2}
                prefix="$"
              />
            </Card>
          </Col>
        </Row>

        {/* Daily Sales Trend */}
        <Card title="Daily Sales Trend">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics?.dailySales || []}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#1890ff"
                fillOpacity={1}
                fill="url(#colorAmount)"
                name="Sales Amount"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Monthly Sales Comparison */}
        <Card title="Monthly Sales Comparison">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics?.monthlySales || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="amount" fill="#1890ff" name="Sales Amount" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Row gutter={16}>
          {/* Sales by Status */}
          <Col span={12}>
            <Card title="Transactions by Status">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(analytics?.salesByStatus || {}).map(([key, value]) => ({
                      name: key.charAt(0).toUpperCase() + key.slice(1),
                      value,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.keys(analytics?.salesByStatus || {}).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* Sales by Payment Method */}
          <Col span={12}>
            <Card title="Sales by Payment Method">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(analytics?.salesByPaymentMethod || {}).map(([key, value]) => ({
                      name: key.replace('_', ' ').toUpperCase(),
                      value,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#82ca9d"
                    dataKey="value"
                  >
                    {Object.keys(analytics?.salesByPaymentMethod || {}).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* Top Products */}
        <Card title="Top Selling Products">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={analytics?.topProducts?.slice(0, 10) || []}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="product_name" type="category" width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#1890ff" name="Revenue" />
              <Bar dataKey="quantity" fill="#52c41a" name="Quantity Sold" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Product Movement Indicators */}
        <Row gutter={16}>
          <Col span={12}>
            <Card title="Product Stock Movement">
              <Space direction="vertical" style={{ width: '100%' }}>
                {analytics?.topProducts?.slice(0, 5).map((product) => (
                  <Row key={product.product_id} justify="space-between" align="middle">
                    <Col span={12}>
                      <strong>{product.product_name}</strong>
                    </Col>
                    <Col span={6} style={{ textAlign: 'right' }}>
                      <span>Qty: {product.quantity}</span>
                    </Col>
                    <Col span={6} style={{ textAlign: 'right' }}>
                      {product.quantity > 0 ? (
                        <span style={{ color: '#cf1322' }}>
                          <ArrowDownOutlined /> Decreasing
                        </span>
                      ) : (
                        <span style={{ color: '#3f8600' }}>
                          <ArrowUpOutlined /> Increasing
                        </span>
                      )}
                    </Col>
                  </Row>
                ))}
              </Space>
            </Card>
          </Col>

          <Col span={12}>
            <Card title="Revenue Breakdown">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row justify="space-between">
                  <Col>Total Sales:</Col>
                  <Col>
                    <strong style={{ color: '#3f8600' }}>
                      ${(analytics?.totalSales || 0).toFixed(2)}
                    </strong>
                  </Col>
                </Row>
                <Row justify="space-between">
                  <Col>Total Purchases:</Col>
                  <Col>
                    <strong style={{ color: '#cf1322' }}>
                      ${(analytics?.totalPurchases || 0).toFixed(2)}
                    </strong>
                  </Col>
                </Row>
                <Row justify="space-between">
                  <Col>Net Revenue:</Col>
                  <Col>
                    <strong style={{ color: '#1890ff' }}>
                      ${(analytics?.totalRevenue || 0).toFixed(2)}
                    </strong>
                  </Col>
                </Row>
                <Row justify="space-between">
                  <Col>Profit Margin:</Col>
                  <Col>
                    <strong style={{ color: '#52c41a' }}>{profitMargin}%</strong>
                  </Col>
                </Row>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
}
