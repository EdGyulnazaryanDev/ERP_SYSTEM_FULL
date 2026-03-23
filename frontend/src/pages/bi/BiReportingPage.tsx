import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Alert,
  Button,
  Card,
  Col,
  ConfigProvider,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  theme,
  message,
  Switch,
} from 'antd';
import {
  BarChartOutlined,
  DatabaseOutlined,
  DollarOutlined,
  DownloadOutlined,
  LineChartOutlined,
  ShoppingOutlined,
  StockOutlined,
  SyncOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import dayjs from 'dayjs';
import { biReportingApi, type ReportTemplate, type TrendRow } from '@/api/biReporting';
import styles from './BiReportingPage.module.css';

const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;

const REPORT_FORMATS = ['pdf', 'excel', 'csv', 'html', 'json'] as const;

const REPORT_CATEGORIES = [
  { value: 'financial', label: 'Financial' },
  { value: 'sales', label: 'Sales' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'hr', label: 'HR' },
  { value: 'operations', label: 'Operations' },
  { value: 'custom', label: 'Custom' },
];

function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    const m = data?.message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function formatPeriodLabel(p: string | Date) {
  const d = dayjs(p);
  return d.isValid() ? d.format('MMM D') : String(p);
}

function OverviewTab() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const kpisQuery = useQuery({
    queryKey: ['bi-kpis'],
    queryFn: () => biReportingApi.getKpis().then((r) => r.data),
  });

  const trendsQuery = useQuery({
    queryKey: ['bi-trends', period],
    queryFn: () =>
      biReportingApi.getTrends('sales', period).then((r) => r.data),
  });

  const chartData = useMemo(() => {
    const rows = trendsQuery.data ?? [];
    return rows.map((row: TrendRow) => ({
      ...row,
      totalNum: Number(row.total),
      label: formatPeriodLabel(row.period),
    }));
  }, [trendsQuery.data]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {kpisQuery.isError && (
        <Alert
          type="error"
          showIcon
          className={styles.alertDark}
          message="Could not load KPIs"
          description="Ensure the backend is running and the database has transactions/inventory tables."
        />
      )}
      <Row gutter={[16, 16]} className={styles.kpiGrid}>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.kpiCard} bordered={false}>
            <div className={styles.kpiIconRevenue}>
              <DollarOutlined />
            </div>
            <Statistic
              title="Total revenue"
              value={kpisQuery.data?.total_revenue ?? 0}
              precision={2}
              prefix="$"
              loading={kpisQuery.isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.kpiCard} bordered={false}>
            <div className={styles.kpiIconOrders}>
              <ShoppingOutlined />
            </div>
            <Statistic
              title="Total orders"
              value={kpisQuery.data?.total_orders ?? 0}
              loading={kpisQuery.isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.kpiCard} bordered={false}>
            <div className={styles.kpiIconCustomers}>
              <LineChartOutlined />
            </div>
            <Statistic
              title="Active customers (30d)"
              value={kpisQuery.data?.active_customers ?? 0}
              loading={kpisQuery.isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className={styles.kpiCard} bordered={false}>
            <div className={styles.kpiIconInventory}>
              <StockOutlined />
            </div>
            <Statistic
              title="Inventory value"
              value={kpisQuery.data?.inventory_value ?? 0}
              precision={2}
              prefix="$"
              loading={kpisQuery.isLoading}
            />
          </Card>
        </Col>
      </Row>

      <Card
        className={styles.chartCard}
        bordered={false}
        title="Transaction trend"
        extra={
          <Select
            value={period}
            onChange={setPeriod}
            style={{ width: 140 }}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
          />
        }
      >
        {trendsQuery.isLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin />
          </div>
        ) : trendsQuery.isError ? (
          <Alert type="warning" message="Trend data unavailable" showIcon />
        ) : chartData.length === 0 ? (
          <Empty description="No trend rows returned" />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData}>
              <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid rgba(148,163,184,0.2)',
                  borderRadius: 8,
                }}
              />
              <Area
                type="monotone"
                dataKey="totalNum"
                name="Amount"
                stroke="#38bdf8"
                fill="url(#biAreaGrad)"
                strokeWidth={2}
              />
              <defs>
                <linearGradient id="biAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>
    </Space>
  );
}

function ReportsTab() {
  const queryClient = useQueryClient();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [templateModal, setTemplateModal] = useState<
    { mode: 'create' } | { mode: 'edit'; template: ReportTemplate } | null
  >(null);
  const [generateForm] = Form.useForm();
  const [templateForm] = Form.useForm();

  const templatesQuery = useQuery({
    queryKey: ['bi-templates'],
    queryFn: () => biReportingApi.getTemplates().then((r) => r.data),
  });

  const reportsQuery = useQuery({
    queryKey: ['bi-saved-reports'],
    queryFn: () => biReportingApi.getSavedReports().then((r) => r.data),
    refetchInterval: (query) => {
      const rows = query.state.data as { status?: string }[] | undefined;
      const pending = rows?.some(
        (x) => x.status === 'pending' || x.status === 'processing',
      );
      return pending ? 3000 : false;
    },
  });

  const generateMutation = useMutation({
    mutationFn: biReportingApi.generateReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-saved-reports'] });
      setGenerateOpen(false);
      generateForm.resetFields();
      message.success('Report generation started');
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: biReportingApi.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-templates'] });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof biReportingApi.updateTemplate>[1];
    }) => biReportingApi.updateTemplate(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-templates'] });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: biReportingApi.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-templates'] });
      message.success('Template deleted');
    },
  });

  const templateOptions = (templatesQuery.data ?? []).map((t) => ({
    value: t.id,
    label: t.name,
    formats: t.supported_formats ?? [],
  }));

  const openCreateTemplate = () => {
    templateForm.resetFields();
    templateForm.setFieldsValue({
      supported_formats: ['csv', 'json'],
      category: 'custom',
    });
    setTemplateModal({ mode: 'create' });
  };

  const openEditTemplate = (t: ReportTemplate) => {
    templateForm.setFieldsValue({
      name: t.name,
      description: t.description,
      category: t.category,
      query: t.query ?? '',
      supported_formats: t.supported_formats?.length
        ? t.supported_formats
        : ['csv', 'json'],
      is_active: t.is_active !== false,
    });
    setTemplateModal({ mode: 'edit', template: t });
  };

  const submitTemplate = async () => {
    const v = await templateForm.validateFields();
    if (templateModal?.mode === 'create') {
      await createTemplateMutation.mutateAsync({
        name: v.name,
        description: v.description,
        category: v.category,
        query: v.query,
        supported_formats: v.supported_formats,
      });
      message.success('Template created');
    } else if (templateModal?.mode === 'edit') {
      await updateTemplateMutation.mutateAsync({
        id: templateModal.template.id,
        body: {
          name: v.name,
          description: v.description,
          category: v.category,
          query: v.query,
          is_active: v.is_active,
        },
      });
      message.success('Template updated');
    }
    setTemplateModal(null);
    templateForm.resetFields();
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div className={styles.toolbar}>
        <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => setGenerateOpen(true)}>
          Generate report
        </Button>
        <Button type="primary" ghost icon={<PlusOutlined />} onClick={openCreateTemplate}>
          New template
        </Button>
        <Button
          icon={<SyncOutlined />}
          onClick={() => {
            void reportsQuery.refetch();
            void templatesQuery.refetch();
          }}
        >
          Refresh
        </Button>
      </div>

      <Card
        className={styles.sectionCard}
        bordered={false}
        title="Report templates"
        size="small"
      >
        <Table
          size="small"
          loading={templatesQuery.isLoading}
          rowKey="id"
          dataSource={templatesQuery.data ?? []}
          pagination={false}
          columns={[
            { title: 'Name', dataIndex: 'name', key: 'name' },
            { title: 'Category', dataIndex: 'category', key: 'category' },
            {
              title: 'Formats',
              dataIndex: 'supported_formats',
              key: 'supported_formats',
              render: (fmts: string[]) =>
                fmts?.map((f) => (
                  <Tag key={f}>{f}</Tag>
                )) ?? '—',
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 160,
              render: (_: unknown, record: ReportTemplate) => (
                <Space>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEditTemplate(record)}
                  >
                    Edit
                  </Button>
                  <Popconfirm
                    title="Delete this template?"
                    okText="Delete"
                    okButtonProps={{ danger: true }}
                    disabled={record.is_system}
                    onConfirm={() => deleteTemplateMutation.mutate(record.id)}
                  >
                    <Button type="link" size="small" danger disabled={record.is_system} icon={<DeleteOutlined />}>
                      Delete
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
        {(templatesQuery.data?.length ?? 0) === 0 && !templatesQuery.isLoading && (
          <Paragraph className={styles.secondaryText}>
            No templates yet — create one with <Text strong>New template</Text>.
          </Paragraph>
        )}
      </Card>

      <Card className={styles.sectionCard} bordered={false} title="Generated reports" size="small">
        <Table
          size="small"
          loading={reportsQuery.isLoading}
          rowKey="id"
          dataSource={reportsQuery.data ?? []}
          columns={[
            { title: 'Name', dataIndex: 'name', key: 'name' },
            { title: 'Format', dataIndex: 'format', key: 'format' },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (s: string) => {
                const color =
                  s === 'completed' ? 'green' : s === 'failed' ? 'red' : 'blue';
                return <Tag color={color}>{s}</Tag>;
              },
            },
            { title: 'Rows', dataIndex: 'row_count', key: 'row_count' },
            {
              title: 'Generated',
              dataIndex: 'generated_at',
              key: 'generated_at',
              render: (d: string) =>
                d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '—',
            },
            {
              title: 'Error',
              dataIndex: 'error_message',
              key: 'error_message',
              ellipsis: true,
              render: (m: string) => m || '—',
            },
          ]}
        />
      </Card>

      <Modal
        title="Generate report"
        open={generateOpen}
        onCancel={() => setGenerateOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={generateForm}
          layout="vertical"
          onFinish={(values) => {
            generateMutation.mutate({
              template_id: values.template_id,
              name: values.name,
              format: values.format,
            });
          }}
        >
          <Form.Item
            name="template_id"
            label="Template"
            rules={[{ required: true, message: 'Select a template' }]}
          >
            <Select
              placeholder="Choose template"
              options={templateOptions}
              onChange={(id) => {
                const t = templateOptions.find((o) => o.value === id);
                const first = t?.formats?.[0];
                if (first) generateForm.setFieldValue('format', first);
              }}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label="Report name"
            rules={[{ required: true, message: 'Enter a name' }]}
          >
            <Input placeholder="e.g. Monthly sales" />
          </Form.Item>
          <Form.Item
            name="format"
            label="Format"
            rules={[{ required: true }]}
            initialValue="csv"
          >
            <Select
              options={REPORT_FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }))}
            />
          </Form.Item>
          {generateMutation.isError && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              message={getApiErrorMessage(generateMutation.error)}
            />
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={generateMutation.isPending} block>
              Start generation
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={templateModal?.mode === 'edit' ? 'Edit template' : 'New report template'}
        open={!!templateModal}
        onCancel={() => setTemplateModal(null)}
        onOk={() => submitTemplate()}
        confirmLoading={
          createTemplateMutation.isPending || updateTemplateMutation.isPending
        }
        width={640}
        destroyOnClose
        className={styles.modalForm}
      >
        <Form form={templateForm} layout="vertical" className={styles.modalForm}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Template display name" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="What this report is for" />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select options={REPORT_CATEGORIES} />
          </Form.Item>
          <Form.Item
            name="query"
            label="SQL query"
            rules={[{ required: true, message: 'SQL is required' }]}
            extra={
              <span className={styles.queryHint}>
                Use <code>$1</code> for tenant id (required). Example:{' '}
                <code>SELECT * FROM transactions WHERE tenant_id = $1 LIMIT 500</code>
              </span>
            }
          >
            <Input.TextArea
              rows={10}
              className={styles.queryEditor}
              placeholder="SELECT ..."
            />
          </Form.Item>
          <Form.Item
            name="supported_formats"
            label="Supported export formats"
            rules={[{ required: true, message: 'Pick at least one format' }]}
          >
            <Select mode="multiple" options={REPORT_FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }))} />
          </Form.Item>
          {templateModal?.mode === 'edit' && (
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch checkedChildren="On" unCheckedChildren="Off" />
            </Form.Item>
          )}
          {(createTemplateMutation.isError || updateTemplateMutation.isError) && (
            <Alert
              type="error"
              showIcon
              message={getApiErrorMessage(
                createTemplateMutation.error ?? updateTemplateMutation.error,
              )}
            />
          )}
        </Form>
      </Modal>
    </Space>
  );
}

function DashboardsTab() {
  const [preview, setPreview] = useState<{ id: string; title: string } | null>(null);

  const dashboardsQuery = useQuery({
    queryKey: ['bi-dashboards'],
    queryFn: () => biReportingApi.getDashboards().then((r) => r.data),
  });

  const widgetPreview = useQuery({
    queryKey: ['bi-widget-data', preview?.id],
    queryFn: () => biReportingApi.getWidgetData(preview!.id).then((r) => r.data),
    enabled: !!preview?.id,
  });

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Paragraph className={styles.secondaryText}>
        Dashboards and widgets are stored per tenant. Widgets use SQL with <code>$1</code> = tenant;
        preview shows raw JSON results.
      </Paragraph>
      <Card className={styles.sectionCard} bordered={false}>
        <Table
          loading={dashboardsQuery.isLoading}
          rowKey="id"
          dataSource={dashboardsQuery.data ?? []}
          expandable={{
            expandedRowRender: (record) => (
              <Table
                size="small"
                rowKey="id"
                dataSource={record.widgets ?? []}
                pagination={false}
                columns={[
                  { title: 'Title', dataIndex: 'title', key: 'title' },
                  { title: 'Type', dataIndex: 'widget_type', key: 'widget_type' },
                  {
                    title: 'Chart',
                    dataIndex: 'chart_type',
                    key: 'chart_type',
                    render: (v) => v ?? '—',
                  },
                  {
                    title: '',
                    key: 'act',
                    width: 100,
                    render: (_: unknown, w: { id: string; title: string }) => (
                      <Button size="small" type="primary" ghost onClick={() => setPreview({ id: w.id, title: w.title })}>
                        Preview
                      </Button>
                    ),
                  },
                ]}
              />
            ),
          }}
          columns={[
            { title: 'Name', dataIndex: 'name', key: 'name' },
            { title: 'Visibility', dataIndex: 'visibility', key: 'visibility' },
            {
              title: 'Default',
              dataIndex: 'is_default',
              key: 'is_default',
              render: (v: boolean) => (v ? <Tag color="cyan">Yes</Tag> : 'No'),
            },
          ]}
        />
        {(dashboardsQuery.data?.length ?? 0) === 0 && !dashboardsQuery.isLoading && (
          <Empty description="No dashboards yet" />
        )}
      </Card>

      <Modal
        title={`Preview: ${preview?.title ?? ''}`}
        open={!!preview}
        onCancel={() => setPreview(null)}
        footer={null}
        width={720}
      >
        {widgetPreview.isLoading && <Spin />}
        {widgetPreview.isError && (
          <Alert type="error" message={getApiErrorMessage(widgetPreview.error)} showIcon />
        )}
        {widgetPreview.data != null && (
          <pre
            style={{
              maxHeight: 400,
              overflow: 'auto',
              fontSize: 12,
              padding: 12,
              borderRadius: 8,
              background: 'rgba(15,23,42,0.8)',
              border: '1px solid rgba(148,163,184,0.15)',
            }}
          >
            {JSON.stringify(widgetPreview.data, null, 2)}
          </pre>
        )}
      </Modal>
    </Space>
  );
}

function ExportsTab() {
  const query = useQuery({
    queryKey: ['bi-export-logs'],
    queryFn: () => biReportingApi.getExportLogs().then((r) => r.data),
  });

  return (
    <Card className={styles.sectionCard} bordered={false}>
      <Table
        loading={query.isLoading}
        rowKey="id"
        dataSource={query.data ?? []}
        columns={[
          { title: 'Type', dataIndex: 'export_type', key: 'export_type' },
          { title: 'Entity', dataIndex: 'entity_name', key: 'entity_name' },
          { title: 'Format', dataIndex: 'format', key: 'format' },
          { title: 'Records', dataIndex: 'record_count', key: 'record_count' },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => <Tag color="processing">{s}</Tag>,
          },
          {
            title: 'When',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm:ss'),
          },
        ]}
      />
    </Card>
  );
}

function QueryLabTab() {
  const [sql, setSql] = useState(
    `SELECT id, transaction_number, total_amount, created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 50`,
  );
  const [result, setResult] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const columns = useMemo(() => {
    if (!result?.length) return [];
    return Object.keys(result[0]).map((key) => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
      render: (v: unknown) =>
        v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''),
    }));
  }, [result]);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await biReportingApi.executeQuery({ query: sql });
      setResult(Array.isArray(data) ? data : []);
      message.success(`Returned ${Array.isArray(data) ? data.length : 0} row(s)`);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        className={styles.alertDark}
        message="Read-only query lab"
        description={
          <>
            <strong>Auto tenant filter:</strong> If you omit <code>$1</code>, the server adds{' '}
            <code>WHERE/AND tenant_id = $1</code> before <code>ORDER BY</code> / <code>LIMIT</code> (unless you
            already filter <code>tenant_id</code>). You can still write <code>WHERE tenant_id = $1</code> yourself
            and add <code>$2</code>… via API. Only <code>SELECT</code> / <code>WITH</code> / <code>EXPLAIN</code>; DDL
            and writes are blocked.
          </>
        }
      />
      <TextArea
        rows={12}
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        className={styles.queryEditor}
        spellCheck={false}
      />
      <div className={styles.toolbar}>
        <Button
          type="primary"
          size="large"
          icon={<DatabaseOutlined />}
          onClick={() => void run()}
          loading={loading}
        >
          Run query
        </Button>
      </div>
      {error && (
        <Alert type="error" message={error} className={styles.alertDark} />
      )}
      {result && (
        <Card className={styles.sectionCard} bordered={false} size="small" title="Result set">
          <Table
            size="small"
            scroll={{ x: true }}
            rowKey={(_, i) => `row-${i}`}
            dataSource={result}
            columns={columns}
          />
        </Card>
      )}
    </Space>
  );
}

export default function BiReportingPage() {
  const { darkAlgorithm } = theme;

  const items = [
    {
      key: 'overview',
      label: (
        <span>
          <BarChartOutlined /> Overview
        </span>
      ),
      children: (
        <div className={styles.tabPanel}>
          <OverviewTab />
        </div>
      ),
    },
    {
      key: 'reports',
      label: (
        <span>
          <DownloadOutlined /> Reports
        </span>
      ),
      children: (
        <div className={styles.tabPanel}>
          <ReportsTab />
        </div>
      ),
    },
    {
      key: 'dashboards',
      label: (
        <span>
          <LineChartOutlined /> Dashboards
        </span>
      ),
      children: (
        <div className={styles.tabPanel}>
          <DashboardsTab />
        </div>
      ),
    },
    {
      key: 'exports',
      label: (
        <span>
          <DatabaseOutlined /> Export logs
        </span>
      ),
      children: (
        <div className={styles.tabPanel}>
          <ExportsTab />
        </div>
      ),
    },
    {
      key: 'query',
      label: (
        <span>
          <ThunderboltOutlined /> Query lab
        </span>
      ),
      children: (
        <div className={styles.tabPanel}>
          <QueryLabTab />
        </div>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ algorithm: darkAlgorithm, token: { colorPrimary: '#38bdf8' } }}>
      <div className={styles.page}>
        <div className={styles.hero}>
          <div className={styles.heroInner}>
            <Title level={1} className={styles.heroTitle}>
              Business intelligence
            </Title>
            <Paragraph className={styles.heroSubtitle}>
              Live KPIs, trends, report templates, dashboards, export history, and a tenant-scoped SQL lab —
              all in one workspace.
            </Paragraph>
          </div>
        </div>
        <div className={styles.content}>
          <Tabs className={styles.tabs} size="large" items={items} />
        </div>
      </div>
    </ConfigProvider>
  );
}
