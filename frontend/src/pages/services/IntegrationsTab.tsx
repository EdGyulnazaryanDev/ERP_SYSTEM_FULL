import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Form, Input, Switch, Button, message, Tag, Space, Alert, Row, Col, Select, Tabs, Typography } from 'antd';
import IntegrationsManagementTab from './IntegrationsManagementTab';
import { useAccessControl } from '@/hooks/useAccessControl';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { 
  SlackOutlined, 
  LinkOutlined, 
  CheckCircleOutlined,
  GithubOutlined,
  ApiOutlined,
  DollarOutlined,
  GoogleOutlined,
  WindowsOutlined,
  TeamOutlined,
  CloudOutlined,
  StopOutlined
} from '@ant-design/icons';
import apiClient from '@/api/client';

const { Title, Text } = Typography;

export default function IntegrationsTab() {
  const queryClient = useQueryClient();
  const { canPerform, user } = useAccessControl();
  const { get: getLimit } = usePlanLimits();
  const canManageIntegrations = canPerform('integrations', 'edit');
  const integrationsLimit = getLimit('integrations') || 1000;
  const isSystemAdmin = user?.isSystemAdmin === true;

  const { data: config } = useQuery({
    queryKey: ['ticket-integrations'],
    queryFn: async () => {
      console.log('🔍 Integrations: Fetching config...');
      const res = await apiClient.get('/service-management/integrations/config');
      console.log('🔍 Integrations: Config response:', res.data);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: platformIntegrations = [] } = useQuery({
    queryKey: ['platform-integrations'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/admin/integrations');
        return res.data;
      } catch (e) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: initialTrelloLists = [] } = useQuery({
    queryKey: ['trello-lists'],
    queryFn: async () => {
      if (!config?.trello_api_key || !config?.trello_token) return [];
      try {
        const res = await apiClient.get('/service-management/integrations/trello/lists');
        return res.data;
      } catch {
        return [];
      }
    },
    enabled: !!config?.trello_api_key && !!config?.trello_token,
    staleTime: 10 * 60 * 1000,
  });

  const { data: tenantRequests = [] } = useQuery({
    queryKey: ['integration-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/service-management/integrations/requests');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !isSystemAdmin,
  });

  const requestUnlockMutation = useMutation({
    mutationFn: (integrationName: string) => apiClient.post('/service-management/integrations/requests', { integration_name: integrationName }),
    onSuccess: () => {
      message.success('Request sent to System Admin!');
      queryClient.invalidateQueries({ queryKey: ['integration-requests'] });
    },
    onError: () => message.error('Failed to send request'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('🔍 Integrations: Saving config:', data);
      if (!canManageIntegrations) {
        console.log('🔍 Integrations: Permission denied for user');
        throw new Error('Permission denied');
      }
      return apiClient.patch('/service-management/integrations/config', data);
    },
    onSuccess: () => {
      console.log('🔍 Integrations: Save success');
      message.success('Integration settings saved');
      queryClient.invalidateQueries({ queryKey: ['ticket-integrations'] });
    },
    onError: (error: any) => {
      console.log('🔍 Integrations: Save error:', error);
      message.error('Failed to save');
    },
  });

  const testSlackMutation = useMutation({
    mutationFn: () => apiClient.post('/service-management/integrations/slack/test'),
    onSuccess: (res) => {
      if (res.data?.success) message.success('Test notification sent to Slack!');
      else message.warning(res.data?.message);
    },
    onError: () => message.error('Slack test failed'),
  });

  const testTrelloMutation = useMutation({
    mutationFn: () => apiClient.post('/service-management/integrations/trello/test'),
    onSuccess: (res) => {
      if (res.data?.success) message.success('Trello connection successful!');
      else message.warning(res.data?.message);
    },
    onError: () => message.error('Trello test failed'),
  });

  const CARD = {
    background: 'rgba(8,25,40,0.6)',
    border: '1px solid rgba(134,166,197,0.12)',
    borderRadius: 16,
    marginBottom: 20,
  };
  const HEAD = { borderBottom: '1px solid rgba(134,166,197,0.1)', background: 'transparent' };

  const availableIntegrations = [
    {
      key: 'slack',
      name: 'Slack Notifications',
      icon: <SlackOutlined style={{ color: '#4A154B', fontSize: 18 }} />,
      description: 'Send ticket notifications to Slack channels',
      configured: !!config?.slack_webhook_url,
      color: 'green'
    },
    {
      key: 'trello',
      name: 'Trello Sync',
      icon: <LinkOutlined style={{ color: '#0052cc', fontSize: 18 }} />,
      description: 'Push tickets as cards to Trello boards',
      configured: !!config?.trello_list_id,
      color: 'blue'
    },
    {
      key: 'jira',
      name: 'Jira Integration',
      icon: <ApiOutlined style={{ color: '#0052CC', fontSize: 18 }} />,
      description: 'Create and sync Jira issues',
      configured: !!config?.jira_domain,
      color: 'blue'
    },
    {
      key: 'github',
      name: 'GitHub Issues',
      icon: <GithubOutlined style={{ color: '#24292e', fontSize: 18 }} />,
      description: 'Create GitHub issues from tickets',
      configured: !!config?.github_repo,
      color: 'black'
    },
    {
      key: 'stripe',
      name: 'Stripe Payments',
      icon: <DollarOutlined style={{ color: '#635BFF', fontSize: 18 }} />,
      description: 'Process payments and subscriptions',
      configured: !!config?.stripe_secret_key,
      color: 'purple'
    },
    {
      key: 'google',
      name: 'Google Workspace',
      icon: <GoogleOutlined style={{ color: '#4285F4', fontSize: 18 }} />,
      description: 'Calendar, Drive, and Gmail integration',
      configured: !!config?.google_workspace_service_account,
      color: 'blue'
    },
    {
      key: 'microsoft',
      name: 'Microsoft 365',
      icon: <WindowsOutlined style={{ color: '#0078D4', fontSize: 18 }} />,
      description: 'Teams, Outlook, and OneDrive integration',
      configured: false,
      color: 'blue'
    },
    {
      key: 'quickbooks',
      name: 'QuickBooks',
      icon: <DollarOutlined style={{ color: '#2CA01C', fontSize: 18 }} />,
      description: 'Accounting and invoicing integration',
      configured: !!config?.quickbooks_client_id,
      color: 'green'
    },
    {
      key: 'teams',
      name: 'Microsoft Teams',
      icon: <TeamOutlined style={{ color: '#6264A7', fontSize: 18 }} />,
      description: 'Team collaboration and notifications',
      configured: false,
      color: 'purple'
    },
    {
      key: 'outlook',
      name: 'Outlook Calendar',
      icon: <TeamOutlined style={{ color: '#6264A7', fontSize: 18 }} />,
      description: 'Calendar sync and scheduling',
      configured: false,
      color: 'blue'
    },
    {
      key: 'dropbox',
      name: 'Dropbox',
      icon: <CloudOutlined style={{ color: '#0061FF', fontSize: 18 }} />,
      description: 'File storage and document sharing',
      configured: false,
      color: 'blue'
    }
  ];

  const [selectedIntegration, setSelectedIntegration] = useState('slack');
  const [loadingTrelloLists, setLoadingTrelloLists] = useState(false);

  const fetchTrelloLists = async () => {
    if (!config?.trello_api_key || !config?.trello_token) {
      message.warning('Please configure Trello API key and token first');
      return;
    }
    
    setLoadingTrelloLists(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['trello-lists'] });
      message.success('Trello lists synced successfully');
    } catch (error) {
      message.error('Failed to fetch Trello lists');
    } finally {
      setLoadingTrelloLists(false);
    }
  };

  const formDefaults = {
    slack_on_create: false,
    slack_on_update: false,
    slack_on_resolve: false,
    trello_auto_push: false,
    ...config
  };

  const filteredIntegrations = availableIntegrations.filter((integration) => {
    if (platformIntegrations && platformIntegrations.length > 0) {
      const platformConfig = platformIntegrations.find((p: any) => p.key === integration.key);
      return platformConfig?.enabled ?? false;
    }
    return false;
  });

  const activeIntegrationCount = [
    config?.slack_webhook_url,
    config?.trello_list_id,
    config?.jira_domain,
    config?.github_repo,
    config?.stripe_secret_key,
    config?.google_workspace_service_account,
    config?.quickbooks_client_id
  ].filter(Boolean).length;

  const renderLimitAction = (key: string, isConfigured: boolean) => {
    // System admin skips limit gating
    if (isSystemAdmin) return null;

    if (isConfigured) return null; // already using it, ignore gate
    
    // Check if they exceed
    if (activeIntegrationCount >= integrationsLimit) {
      // Check if unlocked via a request
      const req = tenantRequests.find((r: any) => r.integration_name === key);
      
      if (req?.status === 'approved') return null; // Unlocked!

      if (req?.status === 'pending') {
        return <Alert showIcon type="warning" message="Unlock Request Pending Review by System Admin." style={{marginBottom: 16}} />;
      }
      if (req?.status === 'rejected') {
        return <Alert showIcon type="error" message="Unlock Request Rejected by System Admin." style={{marginBottom: 16}} />;
      }

      return (
        <Alert
          showIcon
          type="error"
          message={`Integration Limit Reached`}
          description={`Your current plan allows ${integrationsLimit} active integrations. You have ${activeIntegrationCount}/${integrationsLimit} configured. Upgrade your plan or request an exception to activate more integrations.`}
          action={<Button type="primary" danger onClick={() => requestUnlockMutation.mutate(key)} loading={requestUnlockMutation.isPending}>Request Exception</Button>}
          style={{ marginBottom: 16 }}
        />
      );
    }
    return null;
  };

  const isLocked = (key: string, isConfigured: boolean) => {
    if (isSystemAdmin || isConfigured) return false;
    if (activeIntegrationCount < integrationsLimit) return false;
    const req = tenantRequests.find((r: any) => r.integration_name === key);
    return req?.status !== 'approved';
  };

  const tabsItems = [
    {
      key: 'integrations',
      label: 'Integrations',
      children: (
        <div>
          <Row gutter={[16, 16]}>
            {/* Left Panel - Integration List */}
            <Col span={8}>
              <Card 
                title="Available Integrations" 
                style={{ ...CARD, minHeight: 600 }}
                headStyle={HEAD}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {filteredIntegrations.map((integration) => {
                    const locked = isLocked(integration.key, integration.configured);
                    return (
                <div
                  key={integration.key}
                  style={{
                    padding: '12px',
                    border: `1px solid ${integration.configured ? '#52c41a' : locked ? '#ff4d4f' : 'rgba(134,166,197,0.12)'}`,
                    borderRadius: '8px',
                    cursor: locked ? 'not-allowed' : 'pointer',
                    background: integration.configured ? 'rgba(82, 196, 26, 0.05)' : locked ? 'rgba(255, 77, 79, 0.05)' : 'transparent',
                    transition: 'all 0.3s ease',
                    opacity: locked ? 0.6 : 1
                  }}
                  onClick={() => !locked && setSelectedIntegration(integration.key)}
                >
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
                    {integration.configured && (
                      <Tag color={integration.color} icon={<CheckCircleOutlined />}>Connected</Tag>
                    )}
                    {locked && (
                      <Tag color="red" icon={<StopOutlined />}>Locked</Tag>
                    )}
                  </Space>
                </div>
              );
              })}
            </Space>
          </Card>
        </Col>

        {/* Right Panel - Integration Configuration */}
        <Col span={16}>
          {(() => {
            const activeIntegration = filteredIntegrations.some(i => i.key === selectedIntegration)
              ? selectedIntegration
              : filteredIntegrations[0]?.key;

            const activeIntegrationConfig = filteredIntegrations.find(i => i.key === activeIntegration);
            const isIntegrationLocked = activeIntegrationConfig ? isLocked(activeIntegration, activeIntegrationConfig.configured) : false;

            if (isIntegrationLocked) {
              return (
                <Card style={{ ...CARD, textAlign: 'center', padding: '60px 20px' }}>
                  <StopOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
                  <Title level={4} style={{ color: '#ff4d4f', margin: '16px 0 8px' }}>Integration Locked</Title>
                  <Text type="secondary">
                    This integration is locked because you've reached your plan limit of {integrationsLimit} active integrations.
                    You currently have {activeIntegrationCount}/{integrationsLimit} configured.
                  </Text>
                  <div style={{ marginTop: 24 }}>
                    <Button type="primary" danger onClick={() => requestUnlockMutation.mutate(activeIntegration)} loading={requestUnlockMutation.isPending}>
                      Request Exception
                    </Button>
                  </div>
                </Card>
              );
            }

            return (
              <>
                {activeIntegration === 'slack' && (
            <Card
              title={
                <Space>
                  <SlackOutlined style={{ color: '#4A154B', fontSize: 18 }} />
                  <span style={{ color: 'var(--app-text)' }}>Slack Notifications</span>
                  {config?.slack_webhook_url && <Tag color="green" icon={<CheckCircleOutlined />}>Connected</Tag>}
                </Space>
              }
              style={CARD} headStyle={HEAD}
            >
              <Alert
                type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }}
                message="Create an Incoming Webhook in your Slack workspace and paste the URL below."
                description={<a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer">How to create a Slack webhook →</a>}
              />
              {renderLimitAction('slack', !!config?.slack_webhook_url)}
              <Form
                layout="vertical"
                initialValues={formDefaults}
                onFinish={(v) => saveMutation.mutate(v)}
                key={`slack-${JSON.stringify(formDefaults)}`}
              >
                <Form.Item name="slack_webhook_url" label="Webhook URL">
                  <Input placeholder="https://hooks.slack.com/services/..." />
                </Form.Item>
                <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Form.Item name="slack_on_create" valuePropName="checked" style={{ margin: 0 }}>
                      <Switch />
                    </Form.Item>
                    <span style={{ color: 'var(--app-text-muted)', fontSize: 13 }}>On ticket created</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Form.Item name="slack_on_update" valuePropName="checked" style={{ margin: 0 }}>
                      <Switch />
                    </Form.Item>
                    <span style={{ color: 'var(--app-text-muted)', fontSize: 13 }}>On status change</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Form.Item name="slack_on_resolve" valuePropName="checked" style={{ margin: 0 }}>
                      <Switch />
                    </Form.Item>
                    <span style={{ color: 'var(--app-text-muted)', fontSize: 13 }}>On resolved</span>
                  </div>
                </div>
                <Space>
                  <Button type="primary" htmlType="submit" loading={saveMutation.isPending} disabled={isLocked('slack', !!config?.slack_webhook_url)}>Save</Button>
                  <Button onClick={() => testSlackMutation.mutate()} loading={testSlackMutation.isPending} disabled={!config?.slack_webhook_url}>
                    Send Test Message
                  </Button>
                </Space>
              </Form>
            </Card>
          )}

          {activeIntegration === 'trello' && (
            <Card
              title={
                <Space>
                  <LinkOutlined style={{ color: '#0052cc', fontSize: 18 }} />
                  <span style={{ color: 'var(--app-text)' }}>Trello Sync</span>
                  {config?.trello_list_id && <Tag color="blue" icon={<CheckCircleOutlined />}>Configured</Tag>}
                </Space>
              }
              style={CARD} headStyle={HEAD}
            >
              <Alert
                type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }}
                message="Connect your Trello board to push tickets as cards."
                description={
                  <span>
                    Get your API key at <a href="https://trello.com/app-key" target="_blank" rel="noreferrer">trello.com/app-key</a>.
                    The List ID is the last part of your Trello list URL.
                  </span>
                }
              />
              {renderLimitAction('trello', !!config?.trello_list_id)}
              <Form
                layout="vertical"
                initialValues={config}
                onFinish={(v) => saveMutation.mutate(v)}
                key={JSON.stringify(config) + 'trello'}
              >
                <Form.Item name="trello_api_key" label="API Key">
                  <Input placeholder="Your Trello API key" />
                </Form.Item>
                <Form.Item name="trello_token" label="Token">
                  <Input.Password placeholder="Your Trello token" />
                </Form.Item>
                <Form.Item name="trello_list_id" label="Target List">
                  <Select 
                    placeholder="Select a Trello list"
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="children"
                    loading={loadingTrelloLists}
                  >
                    {initialTrelloLists.map((list: any) => (
                      <Select.Option key={list.id} value={list.id}>
                        {list.name}
                      </Select.Option>
                    ))}
                  </Select>
                  {config?.trello_list_id && (
                    <div style={{ marginTop: 8, fontSize: '12px', color: 'var(--app-text-muted)' }}>
                      Current: {initialTrelloLists.find((l: any) => l.id === config.trello_list_id)?.name || config.trello_list_id}
                    </div>
                  )}
                </Form.Item>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                  <Form.Item name="trello_auto_push" valuePropName="checked" style={{ margin: 0 }}>
                    <Switch />
                  </Form.Item>
                  <span style={{ color: 'var(--app-text-muted)', fontSize: 13 }}>Auto-push new tickets to Trello</span>
                </div>
                <Space>
                  <Button type="primary" htmlType="submit" loading={saveMutation.isPending} disabled={isLocked('trello', !!config?.trello_list_id)}>Save Trello Config</Button>
                  <Button onClick={() => testTrelloMutation.mutate()} loading={testTrelloMutation.isPending} disabled={!config?.trello_list_id}>
                    Test Connection
                  </Button>
                  <Button 
                    onClick={fetchTrelloLists} 
                    loading={loadingTrelloLists}
                    type="default"
                  >
                    Sync Lists
                  </Button>
                </Space>
              </Form>
            </Card>
          )}

          {activeIntegration === 'jira' && (
            <Card
              title={
                <Space>
                  <ApiOutlined style={{ color: '#0052CC', fontSize: 18 }} />
                  <span style={{ color: 'var(--app-text)' }}>Jira Integration</span>
                  {config?.jira_domain && <Tag color="blue" icon={<CheckCircleOutlined />}>Configured</Tag>}
                </Space>
              }
              style={CARD} headStyle={HEAD}
            >
              <Alert
                type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }}
                message="Connect to Jira to create and sync issues."
                description="Generate an API token from your Atlassian account settings."
              />
              <Form
                layout="vertical"
                initialValues={config}
                onFinish={(v) => saveMutation.mutate(v)}
                key={JSON.stringify(config) + 'jira'}
              >
                <Form.Item name="jira_domain" label="Jira Domain">
                  <Input placeholder="your-domain.atlassian.net" />
                </Form.Item>
                <Form.Item name="jira_email" label="Email">
                  <Input placeholder="your-email@company.com" />
                </Form.Item>
                <Form.Item name="jira_api_key" label="API Token">
                  <Input.Password placeholder="Your Jira API token" />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>Save Jira Config</Button>
              </Form>
            </Card>
          )}

          {activeIntegration === 'github' && (
            <Card
              title={
                <Space>
                  <GithubOutlined style={{ color: '#24292e', fontSize: 18 }} />
                  <span style={{ color: 'var(--app-text)' }}>GitHub Issues</span>
                  {config?.github_repo && <Tag color="black" icon={<CheckCircleOutlined />}>Configured</Tag>}
                </Space>
              }
              style={CARD} headStyle={HEAD}
            >
              <Alert
                type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }}
                message="Create GitHub issues from service tickets."
                description="Generate a personal access token with repo permissions."
              />
              <Form
                layout="vertical"
                initialValues={config}
                onFinish={(v) => saveMutation.mutate(v)}
                key={JSON.stringify(config) + 'github'}
              >
                <Form.Item name="github_token" label="Personal Access Token">
                  <Input.Password placeholder="ghp_..." />
                </Form.Item>
                <Form.Item name="github_repo" label="Repository (owner/repo)">
                  <Input placeholder="owner/repository" />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>Save GitHub Config</Button>
              </Form>
            </Card>
          )}

          {activeIntegration === 'stripe' && (
            <Card
              title={
                <Space>
                  <DollarOutlined style={{ color: '#635BFF', fontSize: 18 }} />
                  <span style={{ color: 'var(--app-text)' }}>Stripe Payments</span>
                  {config?.stripe_secret_key && <Tag color="purple" icon={<CheckCircleOutlined />}>Connected</Tag>}
                </Space>
              }
              style={CARD} headStyle={HEAD}
            >
              <Alert
                type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }}
                message="Process payments and manage subscriptions."
                description="Get your API keys from the Stripe Dashboard."
              />
              <Form
                layout="vertical"
                initialValues={config}
                onFinish={(v) => saveMutation.mutate(v)}
                key={JSON.stringify(config) + 'stripe'}
              >
                <Form.Item name="stripe_publishable_key" label="Publishable Key">
                  <Input placeholder="pk_test_..." />
                </Form.Item>
                <Form.Item name="stripe_secret_key" label="Secret Key">
                  <Input.Password placeholder="sk_test_..." />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>Save Stripe Config</Button>
              </Form>
            </Card>
          )}

          {activeIntegration === 'google' && (
            <Card
              title={
                <Space>
                  <GoogleOutlined style={{ color: '#4285F4', fontSize: 18 }} />
                  <span style={{ color: 'var(--app-text)' }}>Google Workspace</span>
                  {config?.google_workspace_service_account && <Tag color="blue" icon={<CheckCircleOutlined />}>Connected</Tag>}
                </Space>
              }
              style={CARD} headStyle={HEAD}
            >
              <Alert
                type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }}
                message="Integrate with Google Calendar, Drive, and Gmail."
                description="Upload your service account JSON key."
              />
              <Form
                layout="vertical"
                initialValues={config}
                onFinish={(v) => saveMutation.mutate(v)}
                key={JSON.stringify(config) + 'google'}
              >
                <Form.Item name="google_workspace_service_account" label="Service Account JSON">
                  <Input.TextArea rows={4} placeholder='{"type": "service_account", ...}' />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>Save Google Config</Button>
              </Form>
            </Card>
          )}

          {activeIntegration === 'quickbooks' && (
            <Card
              title={
                <Space>
                  <DollarOutlined style={{ color: '#2CA01C', fontSize: 18 }} />
                  <span style={{ color: 'var(--app-text)' }}>QuickBooks</span>
                  {config?.quickbooks_client_id && <Tag color="green" icon={<CheckCircleOutlined />}>Connected</Tag>}
                </Space>
              }
              style={CARD} headStyle={HEAD}
            >
              <Alert
                type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }}
                message="Sync with QuickBooks for accounting and invoicing."
                description="Create an app in the QuickBooks Developer Portal."
              />
              <Form
                layout="vertical"
                initialValues={config}
                onFinish={(v) => saveMutation.mutate(v)}
                key={JSON.stringify(config) + 'quickbooks'}
              >
                <Form.Item name="quickbooks_client_id" label="Client ID">
                  <Input placeholder="Your QuickBooks Client ID" />
                </Form.Item>
                <Form.Item name="quickbooks_client_secret" label="Client Secret">
                  <Input.Password placeholder="Your QuickBooks Client Secret" />
                </Form.Item>
                <Form.Item name="quickbooks_realm_id" label="Realm ID">
                  <Input placeholder="Your Company Realm ID" />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>Save QuickBooks Config</Button>
              </Form>
            </Card>
          )}
              </>
            );
          })()}
        </Col>
      </Row>
    </div>
          ),
        },
      ];

  // Add management tab only for system admins
  if (isSystemAdmin) {
    tabsItems.push({
      key: 'management',
      label: 'Integration Management',
      children: <IntegrationsManagementTab />,
    });
  }

  return (
    <div>
      {/* Plan Status Banner for Tenant Admins */}
      {!isSystemAdmin && (
        <Alert
          showIcon
          type={activeIntegrationCount >= integrationsLimit ? "warning" : "success"}
          message={`Integration Plan Status`}
          description={
            <span>
              You have <strong>{activeIntegrationCount}/{integrationsLimit}</strong> active integrations configured.
              {activeIntegrationCount >= integrationsLimit && (
                <span style={{ marginLeft: 8 }}>
                  You've reached your plan limit. <strong>Upgrade your plan</strong> or <strong>request exceptions</strong> to activate more integrations.
                </span>
              )}
            </span>
          }
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      <Tabs
        defaultActiveKey="integrations"
        items={tabsItems}
      />
    </div>
  );
}
