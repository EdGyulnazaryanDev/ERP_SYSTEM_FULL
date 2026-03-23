import { useState } from 'react';
import {
  Table,
  Button,
  Switch,
  Space,
  Tag,
  Modal,
  Typography,
  Tooltip,
  notification,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSubscriptionsApi, type SubscriptionPlan, type CreatePlanPayload } from '@/api/subscriptions';
import PlanFormModal from './PlanFormModal';

const { Title, Text } = Typography;

const FEATURE_LABELS: Record<string, string> = {
  warehouse: 'Warehouse',
  accounting: 'Accounting',
  reports: 'BI & Reports',
};

export default function SubscriptionPlansPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const res = await adminSubscriptionsApi.getAllPlans();
      return res.data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-plans'] });

  const createMutation = useMutation({
    mutationFn: (data: CreatePlanPayload) => adminSubscriptionsApi.createPlan(data),
    onSuccess: () => {
      notification.success({ message: 'Plan created successfully' });
      setFormOpen(false);
      invalidate();
    },
    onError: () => notification.error({ message: 'Failed to create plan' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreatePlanPayload }) =>
      adminSubscriptionsApi.updatePlan(id, data),
    onSuccess: () => {
      notification.success({ message: 'Plan updated successfully' });
      setFormOpen(false);
      setEditingPlan(null);
      invalidate();
    },
    onError: () => notification.error({ message: 'Failed to update plan' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminSubscriptionsApi.deletePlan(id),
    onSuccess: () => {
      notification.success({ message: 'Plan deleted' });
      invalidate();
    },
    onError: () => notification.error({ message: 'Cannot delete a plan with active subscribers' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminSubscriptionsApi.setPlanStatus(id, isActive),
    onSuccess: () => invalidate(),
    onError: () => notification.error({ message: 'Failed to update plan status' }),
  });

  const handleSubmit = (values: CreatePlanPayload) => {
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormOpen(true);
  };

  const handleDelete = (plan: SubscriptionPlan) => {
    Modal.confirm({
      title: `Delete "${plan.name}"?`,
      content: 'This action cannot be undone. Plans with active subscribers cannot be deleted.',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(plan.id),
    });
  };

  const columns = [
    {
      title: 'Plan',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: SubscriptionPlan) => (
        <Space>
          <CrownOutlined style={{ color: '#faad14' }} />
          <div>
            <Text strong>{name}</Text>
            {record.description && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Monthly',
      dataIndex: ['pricing', 'monthly'],
      key: 'monthly',
      render: (v: number) => (
        <Text strong style={{ color: '#52c41a' }}>${v.toFixed(2)}</Text>
      ),
    },
    {
      title: 'Yearly',
      dataIndex: ['pricing', 'yearly'],
      key: 'yearly',
      render: (v: number) => (
        <Text>${v.toFixed(2)}</Text>
      ),
    },
    {
      title: 'Features',
      dataIndex: 'features',
      key: 'features',
      render: (features: string[]) =>
        features.length === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <Space size={4} wrap>
            {features.map((f) => (
              <Tag key={f} color="blue" style={{ fontSize: 11 }}>
                {FEATURE_LABELS[f] ?? f}
              </Tag>
            ))}
          </Space>
        ),
    },
    {
      title: 'Limits',
      dataIndex: 'limits',
      key: 'limits',
      render: (limits: Record<string, number | null>) => {
        const entries = Object.entries(limits).filter(([, v]) => v !== null);
        return entries.length === 0 ? (
          <Badge status="success" text="Unlimited" />
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {entries.map(([k, v]) => `${k}: ${v}`).join(' · ')}
          </Text>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, record: SubscriptionPlan) => (
        <Switch
          checked={record.isActive ?? true}
          size="small"
          onChange={(checked) => statusMutation.mutate({ id: record.id, isActive: checked })}
          checkedChildren="Active"
          unCheckedChildren="Off"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: SubscriptionPlan) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ color: '#1677ff' }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, color: '#f0f6ff' }}>
            Subscription Plans
          </Title>
          <Text type="secondary">
            Manage plans available to all tenants across the platform
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingPlan(null);
            setFormOpen(true);
          }}
        >
          Create Plan
        </Button>
      </div>

      <Table
        dataSource={plans}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        style={{
          background: 'rgba(8, 25, 40, 0.5)',
          borderRadius: 12,
          border: '1px solid rgba(134, 166, 197, 0.1)',
        }}
      />

      <PlanFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingPlan(null);
        }}
        onSubmit={handleSubmit}
        initialValues={editingPlan}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
