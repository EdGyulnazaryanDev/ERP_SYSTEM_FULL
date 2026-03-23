import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Typography,
  Switch,
  Modal,
  notification,
  Spin,
  Badge,
  Divider,
  Space,
} from 'antd';
import { CheckCircleFilled, CrownOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi, type SubscriptionPlan } from '@/api/subscriptions';
import { useAuthStore } from '@/store/authStore';
import { Navigate } from 'react-router-dom';

const { Title, Text } = Typography;

const FEATURE_LABELS: Record<string, string> = {
  warehouse: 'Warehouse',
  accounting: 'Accounting',
  reports: 'BI & Reports',
};

const LIMIT_LABELS: Record<string, string> = {
  users: 'Users',
  products: 'Products',
  categories: 'Categories',
  transactions_per_month: 'Transactions/mo',
  storage_gb: 'Storage (GB)',
};

const PLAN_COLORS = ['#52c41a', '#1677ff', '#722ed1', '#fa8c16'];

export default function SubscriptionPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [yearly, setYearly] = useState(false);

  // Redirect system admins away
  if (user?.isSystemAdmin) {
    return <Navigate to="/" replace />;
  }

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['available-plans'],
    queryFn: async () => {
      const res = await subscriptionsApi.getPlans();
      return res.data;
    },
  });

  const { data: currentSub, isLoading: subLoading } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: async () => {
      const res = await subscriptionsApi.getCurrentSubscription();
      return res.data;
    },
  });

  const selectMutation = useMutation({
    mutationFn: (planCode: string) =>
      subscriptionsApi.selectPlan({
        planCode,
        billingCycle: yearly ? 'yearly' : 'monthly',
        autoRenew: true,
      }),
    onSuccess: () => {
      notification.success({ message: 'Subscription updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
    },
    onError: () => notification.error({ message: 'Failed to update subscription' }),
  });

  const handleSelect = (plan: SubscriptionPlan) => {
    Modal.confirm({
      title: `Switch to ${plan.name}?`,
      content: `You will be billed $${yearly ? plan.pricing.yearly : plan.pricing.monthly} ${yearly ? 'per year' : 'per month'}.`,
      okText: 'Confirm',
      onOk: () => selectMutation.mutate(plan.code),
    });
  };

  if (plansLoading || subLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const currentPlanCode = currentSub?.plan.code;

  return (
    <div>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <Title level={3} style={{ color: '#f0f6ff', margin: 0 }}>
          Choose Your Plan
        </Title>
        <Text type="secondary">
          Upgrade or downgrade at any time. Changes take effect immediately.
        </Text>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: yearly ? '#8a9bb0' : '#f0f6ff' }}>Monthly</Text>
          <Switch checked={yearly} onChange={setYearly} />
          <Text style={{ color: yearly ? '#f0f6ff' : '#8a9bb0' }}>
            Yearly <Tag color="green" style={{ marginLeft: 4 }}>Save ~17%</Tag>
          </Text>
        </div>
      </div>

      <Row gutter={[20, 20]} justify="center">
        {plans.map((plan, idx) => {
          const isCurrent = plan.code === currentPlanCode;
          const price = yearly ? plan.pricing.yearly : plan.pricing.monthly;
          const accentColor = PLAN_COLORS[idx % PLAN_COLORS.length];

          return (
            <Col xs={24} sm={12} lg={6} key={plan.id}>
              <Card
                style={{
                  height: '100%',
                  background: isCurrent
                    ? 'rgba(22, 119, 255, 0.12)'
                    : 'rgba(8, 25, 40, 0.6)',
                  border: isCurrent
                    ? '2px solid rgba(22, 119, 255, 0.6)'
                    : '1px solid rgba(134, 166, 197, 0.12)',
                  borderRadius: 16,
                  position: 'relative',
                  overflow: 'visible',
                }}
                bodyStyle={{ padding: 24 }}
              >
                {isCurrent && (
                  <Badge.Ribbon text="Current Plan" color="blue" />
                )}

                <div style={{ marginBottom: 16 }}>
                  <Space>
                    <CrownOutlined style={{ color: accentColor, fontSize: 18 }} />
                    <Text strong style={{ fontSize: 18, color: '#f0f6ff' }}>
                      {plan.name}
                    </Text>
                  </Space>
                  {plan.description && (
                    <div style={{ marginTop: 6 }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {plan.description}
                      </Text>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 32, fontWeight: 800, color: accentColor }}>
                    ${price}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    /{yearly ? 'yr' : 'mo'}
                  </Text>
                </div>

                <Divider style={{ margin: '12px 0', borderColor: 'rgba(134,166,197,0.12)' }} />

                {/* Features */}
                {plan.features.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    {plan.features.map((f) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <CheckCircleFilled style={{ color: accentColor, fontSize: 13 }} />
                        <Text style={{ fontSize: 13, color: '#c8dff0' }}>
                          {FEATURE_LABELS[f] ?? f}
                        </Text>
                      </div>
                    ))}
                  </div>
                )}

                {/* Limits */}
                <div style={{ marginBottom: 20 }}>
                  {Object.entries(plan.limits).map(([key, value]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {LIMIT_LABELS[key] ?? key}
                      </Text>
                      <Text style={{ fontSize: 12, color: value === null ? '#52c41a' : '#c8dff0' }}>
                        {value === null ? 'Unlimited' : value.toLocaleString()}
                      </Text>
                    </div>
                  ))}
                </div>

                <Button
                  type={isCurrent ? 'default' : 'primary'}
                  block
                  disabled={isCurrent}
                  loading={selectMutation.isPending}
                  onClick={() => handleSelect(plan)}
                  style={isCurrent ? { opacity: 0.6 } : {}}
                >
                  {isCurrent ? 'Current Plan' : `Select ${plan.name}`}
                </Button>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
