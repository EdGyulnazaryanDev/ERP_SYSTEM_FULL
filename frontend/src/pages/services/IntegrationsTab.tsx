import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Form, Input, Switch, Button, message, Tag, Space, Alert } from 'antd';
import { SlackOutlined, LinkOutlined, CheckCircleOutlined } from '@ant-design/icons';
import apiClient from '@/api/client';

export default function IntegrationsTab() {
  const queryClient = useQueryClient();

  const { data: config } = useQuery({
    queryKey: ['ticket-integrations'],
    queryFn: async () => {
      const res = await apiClient.get('/service-management/integrations/config');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiClient.put('/service-management/integrations/config', data),
    onSuccess: () => {
      message.success('Integration settings saved');
      queryClient.invalidateQueries({ queryKey: ['ticket-integrations'] });
    },
    onError: () => message.error('Failed to save'),
  });

  const testSlackMutation = useMutation({
    mutationFn: () => apiClient.post('/service-management/integrations/slack/test'),
    onSuccess: (res) => {
      if (res.data?.success) message.success('Test notification sent to Slack!');
      else message.warning(res.data?.message);
    },
    onError: () => message.error('Slack test failed'),
  });

  const CARD = {
    background: 'rgba(8,25,40,0.6)',
    border: '1px solid rgba(134,166,197,0.12)',
    borderRadius: 16,
    marginBottom: 20,
  };
  const HEAD = { borderBottom: '1px solid rgba(134,166,197,0.1)', background: 'transparent' };

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Slack */}
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
        <Form
          layout="vertical"
          initialValues={config}
          onFinish={(v) => saveMutation.mutate(v)}
          key={JSON.stringify(config)}
        >
          <Form.Item name="slack_webhook_url" label="Webhook URL">
            <Input placeholder="https://hooks.slack.com/services/..." />
          </Form.Item>
          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            <Form.Item name="slack_on_create" valuePropName="checked" style={{ margin: 0 }}>
              <Switch /> <span style={{ marginLeft: 8, color: 'var(--app-text-muted)', fontSize: 13 }}>On ticket created</span>
            </Form.Item>
            <Form.Item name="slack_on_update" valuePropName="checked" style={{ margin: 0 }}>
              <Switch /> <span style={{ marginLeft: 8, color: 'var(--app-text-muted)', fontSize: 13 }}>On status change</span>
            </Form.Item>
            <Form.Item name="slack_on_resolve" valuePropName="checked" style={{ margin: 0 }}>
              <Switch /> <span style={{ marginLeft: 8, color: 'var(--app-text-muted)', fontSize: 13 }}>On resolved</span>
            </Form.Item>
          </div>
          <Space>
            <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>Save</Button>
            <Button onClick={() => testSlackMutation.mutate()} loading={testSlackMutation.isPending}>
              Send Test Message
            </Button>
          </Space>
        </Form>
      </Card>

      {/* Trello */}
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
          <Form.Item name="trello_list_id" label="List ID (target column)">
            <Input placeholder="e.g. 5f3a2b1c0d9e8f7a6b5c4d3e" />
          </Form.Item>
          <Form.Item name="trello_auto_push" valuePropName="checked">
            <Switch /> <span style={{ marginLeft: 8, color: 'var(--app-text-muted)', fontSize: 13 }}>Auto-push new tickets to Trello</span>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>Save Trello Config</Button>
        </Form>
      </Card>
    </div>
  );
}
