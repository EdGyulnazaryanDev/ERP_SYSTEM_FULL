import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Switch, message, Space, Alert, Row, Col, Tag, Table, Button } from 'antd';
import { 
  ApiOutlined,
  SlackOutlined,
  LinkOutlined,
  GithubOutlined,
  DollarOutlined,
  GoogleOutlined,
  WindowsOutlined,
  TeamOutlined,
  CloudOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import apiClient from '@/api/client';

interface IntegrationConfig {
  key: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
  category: string;
}

export default function IntegrationsManagementTab() {
  const queryClient = useQueryClient();

  const { data: integrations = [] } = useQuery({
    queryKey: ['platform-integrations'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/integrations');
      return res.data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      apiClient.patch(`/admin/integrations/${key}`, { enabled }),
    onSuccess: () => {
      message.success('Integration updated');
      queryClient.invalidateQueries({ queryKey: ['platform-integrations'] });
    },
    onError: () => message.error('Failed to update integration'),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['integration-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/service-management/integrations/requests');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch(`/service-management/integrations/requests/${id}`, { status }),
    onSuccess: () => {
      message.success('Request updated');
      queryClient.invalidateQueries({ queryKey: ['integration-requests'] });
    },
    onError: () => message.error('Failed to update request'),
  });

  const availableIntegrations: IntegrationConfig[] = [
    {
      key: 'slack',
      name: 'Slack Notifications',
      icon: <SlackOutlined style={{ color: '#4A154B', fontSize: 18 }} />,
      description: 'Send ticket notifications to Slack channels',
      enabled: integrations.find((i: any) => i.key === 'slack')?.enabled ?? false,
      category: 'Communication'
    },
    {
      key: 'trello',
      name: 'Trello Sync',
      icon: <LinkOutlined style={{ color: '#0052cc', fontSize: 18 }} />,
      description: 'Push tickets as cards to Trello boards',
      enabled: integrations.find((i: any) => i.key === 'trello')?.enabled ?? false,
      category: 'Project Management'
    },
    {
      key: 'jira',
      name: 'Jira Integration',
      icon: <ApiOutlined style={{ color: '#0052CC', fontSize: 18 }} />,
      description: 'Create and sync Jira issues',
      enabled: integrations.find((i: any) => i.key === 'jira')?.enabled ?? false,
      category: 'Project Management'
    },
    {
      key: 'github',
      name: 'GitHub Issues',
      icon: <GithubOutlined style={{ color: '#24292e', fontSize: 18 }} />,
      description: 'Create GitHub issues from tickets',
      enabled: integrations.find((i: any) => i.key === 'github')?.enabled ?? false,
      category: 'Development'
    },
    {
      key: 'stripe',
      name: 'Stripe Payments',
      icon: <DollarOutlined style={{ color: '#635BFF', fontSize: 18 }} />,
      description: 'Process payments and subscriptions',
      enabled: integrations.find((i: any) => i.key === 'stripe')?.enabled ?? false,
      category: 'Payments'
    },
    {
      key: 'google',
      name: 'Google Workspace',
      icon: <GoogleOutlined style={{ color: '#4285F4', fontSize: 18 }} />,
      description: 'Calendar, Drive, and Gmail integration',
      enabled: integrations.find((i: any) => i.key === 'google')?.enabled ?? false,
      category: 'Productivity'
    },
    {
      key: 'microsoft',
      name: 'Microsoft 365',
      icon: <WindowsOutlined style={{ color: '#0078D4', fontSize: 18 }} />,
      description: 'Teams, Outlook, and OneDrive integration',
      enabled: integrations.find((i: any) => i.key === 'microsoft')?.enabled ?? false,
      category: 'Productivity'
    },
    {
      key: 'quickbooks',
      name: 'QuickBooks',
      icon: <DollarOutlined style={{ color: '#2CA01C', fontSize: 18 }} />,
      description: 'Accounting and invoicing integration',
      enabled: integrations.find((i: any) => i.key === 'quickbooks')?.enabled ?? false,
      category: 'Accounting'
    },
    {
      key: 'teams',
      name: 'Microsoft Teams',
      icon: <TeamOutlined style={{ color: '#6264A7', fontSize: 18 }} />,
      description: 'Team collaboration and notifications',
      enabled: integrations.find((i: any) => i.key === 'teams')?.enabled ?? false,
      category: 'Communication'
    },
    {
      key: 'dropbox',
      name: 'Dropbox',
      icon: <CloudOutlined style={{ color: '#0061FF', fontSize: 18 }} />,
      description: 'File storage and document sharing',
      enabled: integrations.find((i: any) => i.key === 'dropbox')?.enabled ?? false,
      category: 'Storage'
    }
  ];

  const categories = [...new Set(availableIntegrations.map(i => i.category))];

  const CARD = {
    background: 'rgba(8,25,40,0.6)',
    border: '1px solid rgba(134,166,197,0.12)',
    borderRadius: 16,
    marginBottom: 20,
  };

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 24, borderRadius: 8 }}
        message="Platform Integrations Management"
        description="Enable or disable integrations available to tenants. Only enabled integrations will be visible in tenant dashboards."
      />

      <Card title="Pending Tenant Requests" style={CARD} headStyle={{ borderBottom: '1px solid rgba(134,166,197,0.1)', background: 'transparent' }}>
        <Table
          dataSource={requests}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            { title: 'Tenant ID', dataIndex: 'tenant_id', key: 'tenant_id', render: (v: string) => <span style={{fontSize: 12, color:'var(--app-text-muted)'}}>{v?.slice(0, 8)}...</span> },
            { title: 'Requested Integration', dataIndex: 'integration_name', key: 'integration_name', render: (v: string) => <span style={{fontWeight:600}}>{v}</span> },
            { 
              title: 'Status', dataIndex: 'status', key: 'status', 
              render: (v: string) => {
                const colors: Record<string, string> = { pending: 'orange', approved: 'green', rejected: 'red' };
                return <Tag color={colors[v] || 'default'}>{v.toUpperCase()}</Tag>;
              } 
            },
            {
              title: 'Actions', key: 'actions', render: (_, record: any) => (
                <Space>
                  <Button size="small" type="primary" disabled={record.status === 'approved'} onClick={() => updateRequestMutation.mutate({ id: record.id, status: 'approved' })}>Approve</Button>
                  <Button size="small" danger disabled={record.status === 'rejected'} onClick={() => updateRequestMutation.mutate({ id: record.id, status: 'rejected' })}>Reject</Button>
                </Space>
              )
            }
          ]}
        />
      </Card>

      {categories.map(category => (
        <Card
          key={category}
          title={category}
          style={CARD}
        >
          <Row gutter={[16, 16]}>
            {availableIntegrations
              .filter(integration => integration.category === category)
              .map((integration) => (
                <Col span={8} key={integration.key}>
                  <Card
                    size="small"
                    style={{
                      background: integration.enabled ? 'rgba(82, 196, 26, 0.05)' : 'transparent',
                      border: `1px solid ${integration.enabled ? '#52c41a' : 'rgba(134,166,197,0.12)'}`,
                      borderRadius: 8,
                    }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        {integration.icon}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, color: 'var(--app-text)' }}>
                            {integration.name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginTop: 2 }}>
                            {integration.description}
                          </div>
                        </div>
                        {integration.enabled && (
                          <Tag color="green" icon={<CheckCircleOutlined />}>Active</Tag>
                        )}
                      </Space>
                      <Switch
                        checked={integration.enabled}
                        onChange={(checked) => toggleMutation.mutate({ 
                          key: integration.key, 
                          enabled: checked 
                        })}
                        loading={toggleMutation.isPending}
                        checkedChildren="Enabled"
                        unCheckedChildren="Disabled"
                      />
                    </Space>
                  </Card>
                </Col>
              ))}
          </Row>
        </Card>
      ))}
    </div>
  );
}
