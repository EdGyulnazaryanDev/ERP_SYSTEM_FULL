import { useEffect, useState } from 'react';
import {
  Form, Input, Button, Typography, Card, Switch, notification, Spin, Tabs,
  Table, Tag, Space, Tooltip, Modal, Avatar, Descriptions, Badge, ColorPicker,
  Progress, Statistic, Row, Col, Alert,
} from 'antd';
import {
  UserOutlined, LoginOutlined, EyeOutlined, ReloadOutlined,
  BgColorsOutlined, BellOutlined, LayoutOutlined, TeamOutlined,
  AuditOutlined, DashboardOutlined, DatabaseOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSettingsApi, adminTenantsApi, adminActivityLogApi, adminSystemHealthApi, type TenantStats } from '@/api/admin';
import { useAuthStore } from '@/store/authStore';

const { Title, Text } = Typography;

const cardStyle = { background: 'rgba(8,25,40,0.5)', border: '1px solid rgba(134,166,197,0.1)', borderRadius: 12 };

const DEFAULT_PRIMARY_COLOR = '#0f766e';

// ── 1. Theme Settings ────────────────────────────────────────────────────────
function ThemeTab({ settings, onSave, saving }: { settings: Record<string, string>; onSave: (v: Record<string, string>) => void; saving: boolean }) {
  const [form] = Form.useForm();
  useEffect(() => {
    form.setFieldsValue({
      platform_name: settings.platform_name ?? '',
      theme_logo_url: settings.theme_logo_url ?? '',
      theme_primary_color: settings.theme_primary_color ?? DEFAULT_PRIMARY_COLOR,
      theme_dark_mode: settings.theme_dark_mode !== 'false',
    });
  }, [settings, form]);

  const handleReset = () => {
    form.setFieldsValue({ theme_primary_color: DEFAULT_PRIMARY_COLOR });
    onSave({ theme_primary_color: DEFAULT_PRIMARY_COLOR });
  };

  return (
    <Card style={{ ...cardStyle, maxWidth: 560 }}>
      <Form form={form} layout="vertical" onFinish={onSave}>
        <Form.Item name="platform_name" label={<span style={{ color: '#f0f6ff' }}>Platform Name</span>}>
          <Input placeholder="My ERP Platform" />
        </Form.Item>
        <Form.Item name="theme_logo_url" label={<span style={{ color: '#f0f6ff' }}>Logo URL</span>}>
          <Input placeholder="https://..." />
        </Form.Item>
        <Form.Item name="theme_primary_color" label={<span style={{ color: '#f0f6ff' }}>Primary Color</span>}>
          <Input placeholder={DEFAULT_PRIMARY_COLOR} prefix={<BgColorsOutlined />} />
        </Form.Item>
        <Form.Item name="theme_dark_mode" label={<span style={{ color: '#f0f6ff' }}>Dark Mode Default</span>} valuePropName="checked">
          <Switch />
        </Form.Item>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="primary" htmlType="submit" loading={saving} style={{ flex: 1 }}>Save Theme</Button>
          <Button onClick={handleReset} title="Reset primary color to default teal">Reset Color</Button>
        </div>
      </Form>
    </Card>
  );
}

// ── 2. Notification Settings ─────────────────────────────────────────────────
function NotificationsTab({ settings, onSave, saving }: { settings: Record<string, string>; onSave: (v: Record<string, string>) => void; saving: boolean }) {
  const [form] = Form.useForm();
  useEffect(() => {
    form.setFieldsValue({
      notify_email: settings.notify_email ?? '',
      notify_new_tenant: settings.notify_new_tenant === 'true',
      notify_plan_change: settings.notify_plan_change === 'true',
    });
  }, [settings, form]);

  return (
    <Card style={{ ...cardStyle, maxWidth: 560 }}>
      <Form form={form} layout="vertical" onFinish={onSave}>
        <Form.Item name="notify_email" label={<span style={{ color: '#f0f6ff' }}>Admin Notification Email</span>}>
          <Input placeholder="admin@platform.com" />
        </Form.Item>
        <Form.Item name="notify_new_tenant" label={<span style={{ color: '#f0f6ff' }}>Notify on New Tenant</span>} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="notify_plan_change" label={<span style={{ color: '#f0f6ff' }}>Notify on Plan Change</span>} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving} block>Save Notifications</Button>
      </Form>
    </Card>
  );
}

// ── 3. Footer Builder ────────────────────────────────────────────────────────
function FooterTab({ settings, onSave, saving }: { settings: Record<string, string>; onSave: (v: Record<string, string>) => void; saving: boolean }) {
  const [form] = Form.useForm();
  useEffect(() => {
    form.setFieldsValue({
      footer_text: settings.footer_text ?? '',
      footer_links: settings.footer_links ?? '',
      footer_show_powered_by: settings.footer_show_powered_by !== 'false',
    });
  }, [settings, form]);

  return (
    <Card style={{ ...cardStyle, maxWidth: 560 }}>
      <Form form={form} layout="vertical" onFinish={onSave}>
        <Form.Item name="footer_text" label={<span style={{ color: '#f0f6ff' }}>Footer Text</span>}>
          <Input placeholder="© 2025 My Company. All rights reserved." />
        </Form.Item>
        <Form.Item
          name="footer_links"
          label={<span style={{ color: '#f0f6ff' }}>Footer Links (JSON)</span>}
          extra={<Text type="secondary" style={{ fontSize: 11 }}>e.g. [{"{"}"label":"Privacy","url":"/privacy"{"}"}]</Text>}
        >
          <Input.TextArea rows={3} placeholder='[{"label":"Privacy","url":"/privacy"}]' />
        </Form.Item>
        <Form.Item name="footer_show_powered_by" label={<span style={{ color: '#f0f6ff' }}>Show "Powered by" badge</span>} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving} block>Save Footer</Button>
      </Form>
    </Card>
  );
}

// ── 4. Tenant Stats ──────────────────────────────────────────────────────────
function TenantStatsTab() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => (await adminTenantsApi.list({ limit: 200 })).data,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['tenant-stats', selectedId],
    queryFn: async () => (await adminTenantsApi.stats(selectedId!)).data,
    enabled: !!selectedId,
  });

  const seedCoaMutation = useMutation({
    mutationFn: (id: string) => adminTenantsApi.seedCoa(id),
    onSuccess: (res) => notification.success({ message: res.data.message }),
    onError: () => notification.error({ message: 'Failed to seed CoA' }),
  });

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string) => <Text style={{ color: '#f0f6ff' }}>{v}</Text> },
    { title: 'Plan', dataIndex: 'planName', key: 'plan', render: (v: string | null) => v ? <Tag color="blue">{v}</Tag> : <Tag>No plan</Tag> },
    { title: 'Status', dataIndex: 'isActive', key: 'status', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, r: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedId(r.id); setStatsOpen(true); }}>
            View Stats
          </Button>
          <Tooltip title="Seed default Chart of Accounts for this tenant (fixes missing JE accounts)">
            <Button size="small" onClick={() => seedCoaMutation.mutate(r.id)} loading={seedCoaMutation.isPending}>
              Seed CoA
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table
        dataSource={data?.data ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 15 }}
        style={{ background: 'rgba(8,25,40,0.5)', borderRadius: 12, border: '1px solid rgba(134,166,197,0.1)' }}
      />
      <Modal
        title={stats ? `Stats — ${stats.tenant.name}` : 'Tenant Stats'}
        open={statsOpen}
        onCancel={() => setStatsOpen(false)}
        footer={null}
        width={600}
      >
        {statsLoading ? <Spin /> : stats && (
          <>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Users"><Badge count={stats.userCount} showZero color="#1677ff" /></Descriptions.Item>
              <Descriptions.Item label="Activity Events"><Badge count={stats.activityCount} showZero color="#52c41a" /></Descriptions.Item>
              <Descriptions.Item label="Domain">{stats.tenant.domain ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Created">{new Date(stats.tenant.createdAt).toLocaleDateString()}</Descriptions.Item>
            </Descriptions>
            <Text style={{ color: '#f0f6ff', fontWeight: 600 }}>Recent Users</Text>
            <Table
              dataSource={stats.recentUsers}
              rowKey="id"
              size="small"
              pagination={false}
              style={{ marginTop: 8 }}
              columns={[
                { title: 'Name', dataIndex: 'name', key: 'name' },
                { title: 'Email', dataIndex: 'email', key: 'email' },
                { title: 'Status', dataIndex: 'isActive', key: 'status', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
                { title: 'Joined', dataIndex: 'createdAt', key: 'joined', render: (v: string) => new Date(v).toLocaleDateString() },
              ]}
            />
          </>
        )}
      </Modal>
    </>
  );
}

// ── 5. Login as Tenant ───────────────────────────────────────────────────────
function ImpersonateTab() {
  const { setAuth } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => (await adminTenantsApi.list({ limit: 200 })).data,
  });

  const impersonateMutation = useMutation({
    mutationFn: (tenantId: string) => adminTenantsApi.impersonate(tenantId),
    onSuccess: (res) => {
      const { accessToken, tenantName, userEmail } = res.data;
      // Decode JWT to get user shape
      const base64 = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      setAuth({
        id: payload.sub,
        email: payload.email,
        name: payload.name ?? payload.email,
        tenantId: payload.tenantId,
        role: payload.role ?? 'admin',
        actorType: 'staff',
        isSystemAdmin: false,
      }, accessToken);
      notification.success({ message: `Now logged in as ${tenantName} (${userEmail})` });
      window.location.href = '/';
    },
    onError: () => notification.error({ message: 'Impersonation failed' }),
  });

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string) => <Text style={{ color: '#f0f6ff' }}>{v}</Text> },
    { title: 'Plan', dataIndex: 'planName', key: 'plan', render: (v: string | null) => v ? <Tag color="blue">{v}</Tag> : <Tag>No plan</Tag> },
    { title: 'Status', dataIndex: 'isActive', key: 'status', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Login As', key: 'impersonate',
      render: (_: unknown, r: any) => (
        <Tooltip title="Login as this tenant's admin user">
          <Button
            size="small"
            type="primary"
            icon={<LoginOutlined />}
            loading={impersonateMutation.isPending}
            disabled={!r.isActive}
            onClick={() => Modal.confirm({
              title: `Login as "${r.name}"?`,
              content: 'You will be redirected to the tenant dashboard. Your admin session will be replaced.',
              okText: 'Login as Tenant',
              onOk: () => impersonateMutation.mutate(r.id),
            })}
          >
            Login as Tenant
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <Table
      dataSource={data?.data ?? []}
      columns={columns}
      rowKey="id"
      loading={isLoading}
      pagination={{ pageSize: 15 }}
      style={{ background: 'rgba(8,25,40,0.5)', borderRadius: 12, border: '1px solid rgba(134,166,197,0.1)' }}
    />
  );
}

// ── 8. Activity Log ──────────────────────────────────────────────────────────
function ActivityLogTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-activity-log'],
    queryFn: async () => (await adminActivityLogApi.list()).data,
  });

  const severityColor: Record<string, string> = { low: 'default', medium: 'orange', high: 'red', critical: 'purple' };

  const columns = [
    { title: 'Time', dataIndex: 'created_at', key: 'time', width: 160, render: (v: string) => new Date(v).toLocaleString() },
    { title: 'Tenant', dataIndex: 'tenant_id', key: 'tenant', width: 120, render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v?.slice(0, 8)}…</Text> },
    { title: 'Action', dataIndex: 'action', key: 'action', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Entity', dataIndex: 'entity_type', key: 'entity' },
    { title: 'Description', dataIndex: 'description', key: 'desc', ellipsis: true },
    { title: 'Severity', dataIndex: 'severity', key: 'severity', render: (v: string) => <Tag color={severityColor[v] ?? 'default'}>{v}</Tag> },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
      </div>
      <Table
        dataSource={data ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        size="small"
        style={{ background: 'rgba(8,25,40,0.5)', borderRadius: 12, border: '1px solid rgba(134,166,197,0.1)' }}
      />
    </>
  );
}

// ── General Settings (original) ──────────────────────────────────────────────
function GeneralTab({ settings, onSave, saving }: { settings: Record<string, string>; onSave: (v: Record<string, string>) => void; saving: boolean }) {
  const [form] = Form.useForm();
  useEffect(() => {
    form.setFieldsValue({
      support_email: settings.support_email ?? '',
      max_tenants: settings.max_tenants ?? '',
      default_plan: settings.default_plan ?? '',
      maintenance_mode: settings.maintenance_mode === 'true',
      registration_enabled: settings.registration_enabled !== 'false',
    });
  }, [settings, form]);

  return (
    <Card style={{ ...cardStyle, maxWidth: 560 }}>
      <Form form={form} layout="vertical" onFinish={onSave}>
        <Form.Item name="support_email" label={<span style={{ color: '#f0f6ff' }}>Support Email</span>}>
          <Input />
        </Form.Item>
        <Form.Item name="max_tenants" label={<span style={{ color: '#f0f6ff' }}>Max Tenants</span>}>
          <Input type="number" />
        </Form.Item>
        <Form.Item name="default_plan" label={<span style={{ color: '#f0f6ff' }}>Default Plan Code</span>}>
          <Input />
        </Form.Item>
        <Form.Item name="maintenance_mode" label={<span style={{ color: '#f0f6ff' }}>Maintenance Mode</span>} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="registration_enabled" label={<span style={{ color: '#f0f6ff' }}>Registration Enabled</span>} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving} block>Save General</Button>
      </Form>
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
// ── System Health Tab ────────────────────────────────────────────────────────
function SystemHealthTab() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => adminSystemHealthApi.get().then(r => r.data),
    refetchInterval: 30_000,
  });

  const statusColor = (s: string) => s === 'ok' ? '#52c41a' : '#ff4d4f';
  const statusTag = (s: string) => <Tag color={s === 'ok' ? 'success' : 'error'}>{s === 'ok' ? 'Online' : 'Error'}</Tag>;

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };

  if (isLoading) return <Spin style={{ display: 'block', margin: '40px auto' }} />;
  if (!data) return null;

  const { infrastructure: inf, business, uptimeSeconds } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Text style={{ color: 'var(--app-text)', fontWeight: 600, fontSize: 15 }}>System Health</Text>
          <Text style={{ color: 'var(--app-text-muted)', fontSize: 12, marginLeft: 12 }}>
            Last updated: {new Date(data.timestamp).toLocaleTimeString()} · auto-refreshes every 30s
          </Text>
        </div>
        <Button size="small" icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>Refresh</Button>
      </div>

      {/* Service Status */}
      <Row gutter={12}>
        <Col span={8}>
          <Card size="small" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space><DatabaseOutlined style={{ color: '#1677ff' }} /><Text style={{ color: 'var(--app-text)' }}>PostgreSQL</Text></Space>
              {statusTag(inf.database.status)}
            </div>
            <Text style={{ color: 'var(--app-text-muted)', fontSize: 11 }}>Latency: {inf.database.latencyMs}ms</Text>
            {inf.database.error && <Alert type="error" message={inf.database.error} style={{ marginTop: 6 }} />}
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space><ThunderboltOutlined style={{ color: '#fa8c16' }} /><Text style={{ color: 'var(--app-text)' }}>Redis</Text></Space>
              {statusTag(inf.redis.status)}
            </div>
            <Text style={{ color: 'var(--app-text-muted)', fontSize: 11 }}>Latency: {inf.redis.latencyMs}ms</Text>
            {inf.redis.error && <Alert type="error" message={inf.redis.error} style={{ marginTop: 6 }} />}
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space><DashboardOutlined style={{ color: '#52c41a' }} /><Text style={{ color: 'var(--app-text)' }}>API Server</Text></Space>
              <Tag color="success">Online</Tag>
            </div>
            <Text style={{ color: 'var(--app-text-muted)', fontSize: 11 }}>Uptime: {formatUptime(uptimeSeconds)}</Text>
          </Card>
        </Col>
      </Row>

      {/* CPU & Memory */}
      <Row gutter={12}>
        <Col span={12}>
          <Card size="small" style={cardStyle} title={<Text style={{ color: 'var(--app-text)' }}>CPU</Text>}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>Load ({inf.cpu.cores} cores)</Text>
                <Text style={{ color: 'var(--app-text)', fontSize: 12, fontWeight: 600 }}>{inf.cpu.usagePercent}%</Text>
              </div>
              <Progress percent={inf.cpu.usagePercent} strokeColor={inf.cpu.usagePercent > 80 ? '#ff4d4f' : inf.cpu.usagePercent > 60 ? '#fa8c16' : '#52c41a'} showInfo={false} size="small" />
            </div>
            <Text style={{ color: 'var(--app-text-muted)', fontSize: 11 }}>
              Load avg: {inf.cpu.loadAvg1m} / {inf.cpu.loadAvg5m} / {inf.cpu.loadAvg15m} (1m/5m/15m)
            </Text>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" style={cardStyle} title={<Text style={{ color: 'var(--app-text)' }}>Memory</Text>}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>{inf.memory.usedMb} MB / {inf.memory.totalMb} MB</Text>
                <Text style={{ color: 'var(--app-text)', fontSize: 12, fontWeight: 600 }}>{inf.memory.usagePercent}%</Text>
              </div>
              <Progress percent={inf.memory.usagePercent} strokeColor={inf.memory.usagePercent > 85 ? '#ff4d4f' : inf.memory.usagePercent > 70 ? '#fa8c16' : '#52c41a'} showInfo={false} size="small" />
            </div>
            <Text style={{ color: 'var(--app-text-muted)', fontSize: 11 }}>
              Node heap: {inf.process.heapUsedMb} MB / {inf.process.heapTotalMb} MB · RSS: {inf.process.rssM} MB
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Business Metrics */}
      <Card size="small" style={cardStyle} title={<Text style={{ color: 'var(--app-text)' }}>Business Metrics</Text>}>
        <Row gutter={24}>
          <Col span={6}><Statistic title={<span style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>Total Tenants</span>} value={business.totalTenants} valueStyle={{ color: 'var(--app-text)', fontSize: 22 }} /></Col>
          <Col span={6}><Statistic title={<span style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>Active Tenants</span>} value={business.activeTenants} valueStyle={{ color: '#52c41a', fontSize: 22 }} /></Col>
          <Col span={6}><Statistic title={<span style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>Inactive Tenants</span>} value={business.inactiveTenants} valueStyle={{ color: 'var(--app-text-muted)', fontSize: 22 }} /></Col>
          <Col span={6}><Statistic title={<span style={{ color: 'var(--app-text-muted)', fontSize: 12 }}>Total Users</span>} value={business.totalUsers} valueStyle={{ color: '#1677ff', fontSize: 22 }} /></Col>
        </Row>
      </Card>

      {/* Process Info */}
      <Card size="small" style={cardStyle} title={<Text style={{ color: 'var(--app-text)' }}>Process Info</Text>}>
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="Node.js">{inf.process.nodeVersion}</Descriptions.Item>
          <Descriptions.Item label="Platform">{inf.process.platform}</Descriptions.Item>
          <Descriptions.Item label="PID">{inf.process.pid}</Descriptions.Item>
          <Descriptions.Item label="CPU Model" span={3}>{inf.cpu.model}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}

export default function GlobalSettingsPage() {
  const qc = useQueryClient();

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ['admin-global-settings'],
    queryFn: async () => (await adminSettingsApi.get()).data,
  });

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) payload[k] = String(v ?? '');
      return adminSettingsApi.update(payload);
    },
    onSuccess: () => {
      notification.success({ message: 'Settings saved' });
      qc.invalidateQueries({ queryKey: ['admin-global-settings'] });
    },
    onError: () => notification.error({ message: 'Failed to save settings' }),
  });

  if (isLoading) return <Spin />;

  const tabItems = [
    {
      key: 'general',
      label: <span><LayoutOutlined /> General</span>,
      children: <GeneralTab settings={settings} onSave={(v) => saveMutation.mutate(v)} saving={saveMutation.isPending} />,
    },
    {
      key: 'theme',
      label: <span><BgColorsOutlined /> Theme</span>,
      children: <ThemeTab settings={settings} onSave={(v) => saveMutation.mutate(v)} saving={saveMutation.isPending} />,
    },
    {
      key: 'notifications',
      label: <span><BellOutlined /> Notifications</span>,
      children: <NotificationsTab settings={settings} onSave={(v) => saveMutation.mutate(v)} saving={saveMutation.isPending} />,
    },
    {
      key: 'footer',
      label: <span><LayoutOutlined /> Footer</span>,
      children: <FooterTab settings={settings} onSave={(v) => saveMutation.mutate(v)} saving={saveMutation.isPending} />,
    },
    {
      key: 'system-health',
      label: <span><DashboardOutlined /> System Health</span>,
      children: <SystemHealthTab />,
    },
    {
      key: 'tenant-stats',
      label: <span><TeamOutlined /> Tenant Stats</span>,
      children: <TenantStatsTab />,
    },
    {
      key: 'impersonate',
      label: <span><LoginOutlined /> Login as Tenant</span>,
      children: <ImpersonateTab />,
    },
    {
      key: 'activity-log',
      label: <span><AuditOutlined /> Activity Log</span>,
      children: <ActivityLogTab />,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, color: '#f8fbff' }}>Global Settings</Title>
        <Text style={{ color: '#a8c4d8' }}>Platform-wide configuration and administration</Text>
      </div>
      <Tabs items={tabItems} />
    </div>
  );
}
