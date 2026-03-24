import { useEffect } from 'react';
import { Form, Input, Button, Typography, Card, Switch, notification, Spin } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSettingsApi } from '@/api/admin';

const { Title, Text } = Typography;

const SETTINGS_FIELDS = [
  { key: 'platform_name', label: 'Platform Name', type: 'text' },
  { key: 'support_email', label: 'Support Email', type: 'text' },
  { key: 'max_tenants', label: 'Max Tenants', type: 'text' },
  { key: 'default_plan', label: 'Default Plan Code', type: 'text' },
  { key: 'maintenance_mode', label: 'Maintenance Mode', type: 'switch' },
  { key: 'registration_enabled', label: 'Registration Enabled', type: 'switch' },
];

export default function GlobalSettingsPage() {
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-global-settings'],
    queryFn: async () => (await adminSettingsApi.get()).data,
  });

  useEffect(() => {
    if (settings) {
      const values: Record<string, unknown> = {};
      for (const f of SETTINGS_FIELDS) {
        if (f.type === 'switch') {
          values[f.key] = settings[f.key] === 'true';
        } else {
          values[f.key] = settings[f.key] ?? '';
        }
      }
      form.setFieldsValue(values);
    }
  }, [settings, form]);

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) {
        payload[k] = String(v ?? '');
      }
      return adminSettingsApi.update(payload);
    },
    onSuccess: () => {
      notification.success({ message: 'Settings saved' });
      qc.invalidateQueries({ queryKey: ['admin-global-settings'] });
    },
    onError: () => notification.error({ message: 'Failed to save settings' }),
  });

  if (isLoading) return <Spin />;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, color: '#f0f6ff' }}>Global Settings</Title>
        <Text type="secondary">Platform-wide configuration</Text>
      </div>

      <Card style={{ maxWidth: 560, background: 'rgba(8, 25, 40, 0.5)', border: '1px solid rgba(134, 166, 197, 0.1)', borderRadius: 12 }}>
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
          {SETTINGS_FIELDS.map((f) => (
            <Form.Item
              key={f.key}
              name={f.key}
              label={<span style={{ color: '#c8dff0' }}>{f.label}</span>}
              valuePropName={f.type === 'switch' ? 'checked' : 'value'}
            >
              {f.type === 'switch' ? <Switch /> : <Input />}
            </Form.Item>
          ))}
          <Button type="primary" htmlType="submit" loading={saveMutation.isPending} block>
            Save Settings
          </Button>
        </Form>
      </Card>
    </div>
  );
}
