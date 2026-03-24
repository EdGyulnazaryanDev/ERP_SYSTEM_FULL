import { Button, Form, Select, Typography, notification, Card } from 'antd';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminTenantsApi, adminSubscriptionsApi } from '@/api/admin';
import { adminSubscriptionsApi as plansApi } from '@/api/subscriptions';

const { Title, Text } = Typography;

export default function PlanAssignmentPage() {
  const [form] = Form.useForm();

  const { data: tenantsData } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => (await adminTenantsApi.list({ limit: 200 })).data,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => (await plansApi.getAllPlans()).data,
  });

  const assignMutation = useMutation({
    mutationFn: (values: { tenantId: string; planCode: string; billingCycle: 'monthly' | 'yearly' }) =>
      adminSubscriptionsApi.assignPlan(values.tenantId, {
        planCode: values.planCode,
        billingCycle: values.billingCycle,
        autoRenew: true,
      }),
    onSuccess: () => {
      notification.success({ message: 'Plan assigned successfully' });
      form.resetFields();
    },
    onError: () => notification.error({ message: 'Failed to assign plan' }),
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, color: '#f0f6ff' }}>Plan Assignment</Title>
        <Text type="secondary">Assign or change a subscription plan for any tenant</Text>
      </div>

      <Card style={{ maxWidth: 520, background: 'rgba(8, 25, 40, 0.5)', border: '1px solid rgba(134, 166, 197, 0.1)', borderRadius: 12 }}>
        <Form form={form} layout="vertical" onFinish={(v) => assignMutation.mutate(v)}>
          <Form.Item name="tenantId" label={<span style={{ color: '#c8dff0' }}>Tenant</span>} rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select a tenant"
              optionFilterProp="label"
              options={(tenantsData?.data ?? []).map((t) => ({ value: t.id, label: `${t.name}${t.planName ? ` (${t.planName})` : ''}` }))}
            />
          </Form.Item>

          <Form.Item name="planCode" label={<span style={{ color: '#c8dff0' }}>Plan</span>} rules={[{ required: true }]}>
            <Select
              placeholder="Select a plan"
              options={plans.filter((p) => p.isActive !== false).map((p) => ({
                value: p.code,
                label: `${p.name} — $${p.pricing.monthly}/mo`,
              }))}
            />
          </Form.Item>

          <Form.Item name="billingCycle" label={<span style={{ color: '#c8dff0' }}>Billing Cycle</span>} initialValue="monthly" rules={[{ required: true }]}>
            <Select options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={assignMutation.isPending} block>
            Assign Plan
          </Button>
        </Form>
      </Card>
    </div>
  );
}
