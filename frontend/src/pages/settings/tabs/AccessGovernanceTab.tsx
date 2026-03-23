import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rbacApi } from '@/api/rbac';
import {
  settingsApi,
  type PageAccessMatrixRow,
  type PageAccessPermissionSet,
} from '@/api/settings';
import {
  subscriptionsApi,
  type BillingCycle,
  type SubscriptionPlan,
} from '@/api/subscriptions';

const { Paragraph, Text } = Typography;

type EditableAccessRow = PageAccessMatrixRow & {
  key: string;
};

const permissionKeys: Array<keyof PageAccessPermissionSet> = [
  'can_view',
  'can_create',
  'can_edit',
  'can_delete',
  'can_export',
];

function isPrivilegedRoleName(roleName?: string) {
  if (!roleName) {
    return false;
  }

  const normalizedName = roleName.trim().toLowerCase().replace(/[\s_-]+/g, '');
  return normalizedName === 'admin' || normalizedName === 'superadmin';
}

export default function AccessGovernanceTab() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string>();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [pendingPlanCode, setPendingPlanCode] = useState<string>();
  const [draftRows, setDraftRows] = useState<Record<string, EditableAccessRow>>(
    {},
  );

  const { data: roles = [] } = useQuery({
    queryKey: ['rbac-roles'],
    queryFn: async () => {
      const response = await rbacApi.getRoles();
      return response.data;
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const response = await subscriptionsApi.getPlans();
      return response.data;
    },
  });

  const { data: currentSubscription } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: async () => {
      const response = await subscriptionsApi.getCurrentSubscription();
      return response.data;
    },
  });

  const { data: roleMatrix = [], isLoading: isMatrixLoading } = useQuery({
    queryKey: ['page-access-matrix', selectedRoleId],
    queryFn: async () => {
      const response = await settingsApi.getRolePageAccessMatrix(selectedRoleId!);
      return response.data;
    },
    enabled: !!selectedRoleId,
  });

  useEffect(() => {
    if (!selectedRoleId && roles.length > 0) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (currentSubscription) {
      setBillingCycle(currentSubscription.billingCycle);
      setPendingPlanCode(currentSubscription.plan.code);
    }
  }, [currentSubscription]);

  useEffect(() => {
    const nextDrafts: Record<string, EditableAccessRow> = {};
    roleMatrix.forEach((row) => {
      nextDrafts[row.page_key] = {
        ...row,
        key: row.page_key,
      };
    });
    setDraftRows(nextDrafts);
  }, [roleMatrix]);

  const savePlanMutation = useMutation({
    mutationFn: subscriptionsApi.selectPlan,
    onSuccess: () => {
      message.success('Subscription plan updated');
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message || 'Failed to update subscription plan',
      );
    },
  });

  const initializeRoleMutation = useMutation({
    mutationFn: ({ roleId, isAdmin }: { roleId: string; isAdmin: boolean }) =>
      settingsApi.initializeRolePageAccess(roleId, isAdmin),
    onSuccess: () => {
      message.success('Default page rules initialized');
      queryClient.invalidateQueries({
        queryKey: ['page-access-matrix', selectedRoleId],
      });
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message || 'Failed to initialize page rules',
      );
    },
  });

  const saveMatrixMutation = useMutation({
    mutationFn: ({
      roleId,
      accessList,
    }: {
      roleId: string;
      accessList: Array<{
        page_key: string;
        permissions: Partial<PageAccessPermissionSet>;
      }>;
    }) => settingsApi.bulkSetRolePageAccess(roleId, accessList),
    onSuccess: () => {
      message.success('Page access rules updated');
      queryClient.invalidateQueries({
        queryKey: ['page-access-matrix', selectedRoleId],
      });
      queryClient.invalidateQueries({ queryKey: ['my-page-access'] });
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message || 'Failed to save page access rules',
      );
    },
  });

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId),
    [roles, selectedRoleId],
  );

  const currentFeatures = currentSubscription?.plan.features ?? [];

  const planCards = useMemo(
    () =>
      plans.map((plan) => ({
        ...plan,
        isCurrent: currentSubscription?.plan.code === plan.code,
      })),
    [plans, currentSubscription],
  );

  const tableData = useMemo(
    () => Object.values(draftRows).sort((a, b) => a.page_name.localeCompare(b.page_name)),
    [draftRows],
  );

  const updateRow = (
    pageKey: string,
    permissionKey: keyof PageAccessPermissionSet,
    value: boolean,
  ) => {
    setDraftRows((current) => ({
      ...current,
      [pageKey]: {
        ...current[pageKey],
        [permissionKey]: value,
      },
    }));
  };

  const handleSaveAccess = () => {
    if (!selectedRoleId) {
      message.warning('Select a role first');
      return;
    }

    const accessList = tableData.map((row) => ({
      page_key: row.page_key,
      permissions: permissionKeys.reduce<Partial<PageAccessPermissionSet>>(
        (accumulator, key) => {
          accumulator[key] = row[key];
          return accumulator;
        },
        {},
      ),
    }));

    saveMatrixMutation.mutate({ roleId: selectedRoleId, accessList });
  };

  const handlePlanSave = () => {
    if (!pendingPlanCode) {
      message.warning('Select a plan');
      return;
    }

    savePlanMutation.mutate({
      planCode: pendingPlanCode,
      billingCycle,
      autoRenew: true,
    });
  };

  const columns = [
    {
      title: 'Page',
      dataIndex: 'page_name',
      key: 'page_name',
      render: (_: string, row: EditableAccessRow) => (
        <div>
          <div className="font-medium">{row.page_name}</div>
          <Text type="secondary">{row.page_path}</Text>
          <div className="mt-1">
            <Tag>{row.category}</Tag>
            {row.required_feature ? (
              <Tag color={currentFeatures.includes(row.required_feature as any) ? 'green' : 'orange'}>
                Feature: {row.required_feature}
              </Tag>
            ) : (
              <Tag color="blue">Core page</Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Plan Status',
      key: 'plan_status',
      render: (_: unknown, row: EditableAccessRow) =>
        row.required_feature ? (
          currentFeatures.includes(row.required_feature as any) ? (
            <Tag color="green">Included in plan</Tag>
          ) : (
            <Tag color="red">Blocked by subscription</Tag>
          )
        ) : (
          <Tag color="default">Not feature-gated</Tag>
        ),
    },
    ...permissionKeys.map((permissionKey) => ({
      title: permissionKey.replace('can_', '').replace('_', ' '),
      key: permissionKey,
      render: (_: unknown, row: EditableAccessRow) => (
        <Switch
          checked={row[permissionKey]}
          onChange={(checked) => updateRow(row.page_key, permissionKey, checked)}
        />
      ),
    })),
  ];

  if (!roles.length) {
    return <Empty description="No roles found. Create roles first in RBAC." />;
  }

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="How access works"
        description="Subscription features decide whether a module is available at all. Page access rules decide which roles can view or act inside those pages."
      />

      <Card title="Subscription Planning">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Radio.Group
            value={billingCycle}
            onChange={(event) => setBillingCycle(event.target.value)}
          >
            <Radio.Button value="monthly">Monthly</Radio.Button>
            <Radio.Button value="yearly">Yearly</Radio.Button>
          </Radio.Group>

          <Row gutter={[16, 16]}>
            {planCards.map((plan: SubscriptionPlan & { isCurrent: boolean }) => (
              <Col xs={24} md={8} key={plan.code}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => setPendingPlanCode(plan.code)}
                  style={{
                    borderColor:
                      pendingPlanCode === plan.code ? '#1677ff' : undefined,
                  }}
                >
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <div className="flex items-center justify-between">
                      <Text strong>{plan.name}</Text>
                      {plan.isCurrent ? <Tag color="green">Current</Tag> : null}
                    </div>
                    <Text type="secondary">{plan.description}</Text>
                    <Text strong>
                      $
                      {billingCycle === 'yearly'
                        ? plan.pricing.yearly
                        : plan.pricing.monthly}
                      /{billingCycle === 'yearly' ? 'year' : 'month'}
                    </Text>
                    <div>
                      {plan.features.map((feature) => (
                        <Tag key={feature} color="blue">
                          {feature}
                        </Tag>
                      ))}
                    </div>
                    <Paragraph style={{ marginBottom: 0 }}>
                      Users limit:{' '}
                      {plan.limits.users === null ? 'Unlimited' : plan.limits.users}
                    </Paragraph>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>

          <div className="flex justify-end">
            <Button
              type="primary"
              onClick={handlePlanSave}
              loading={savePlanMutation.isPending}
            >
              Save Subscription Plan
            </Button>
          </div>
        </Space>
      </Card>

      <Card
        title="Role-Based Page Governance"
        extra={
          <Space>
            <Select
              style={{ width: 240 }}
              value={selectedRoleId}
              onChange={setSelectedRoleId}
              options={roles.map((role) => ({
                value: role.id,
                label: role.name,
              }))}
            />
            <Button
              onClick={() =>
                    selectedRoleId
                  ? initializeRoleMutation.mutate({
                      roleId: selectedRoleId,
                      isAdmin: isPrivilegedRoleName(selectedRole?.name),
                    })
                  : undefined
              }
              loading={initializeRoleMutation.isPending}
            >
              Initialize Defaults
            </Button>
            <Button
              type="primary"
              onClick={handleSaveAccess}
              loading={saveMatrixMutation.isPending}
            >
              Save Page Rules
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message="Role permissions do not bypass subscription limits"
            description="Even if a role can view a page, users will still be blocked when the current company plan does not include the required feature."
          />

          <Table
            rowKey="page_key"
            columns={columns}
            dataSource={tableData}
            loading={isMatrixLoading}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 1100 }}
          />
        </Space>
      </Card>
    </Space>
  );
}
