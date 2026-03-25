import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Empty,
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
import { useAuthStore } from '@/store/authStore';
import { settingsApi, type PageAccessMatrixRow, type PageAccessPermissionSet } from '@/api/settings';
import { useAccessControl } from '@/hooks/useAccessControl';

const { Text } = Typography;

type EditableRow = PageAccessMatrixRow & { key: string };

const PERMISSION_KEYS: Array<keyof PageAccessPermissionSet> = [
  'can_view', 'can_create', 'can_edit', 'can_delete', 'can_export',
];

function normalizeRole(name?: string) {
  return (name ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export default function AccessGovernanceTab() {
  const { user } = useAuthStore();
  const { userRoles } = useAccessControl();
  const queryClient = useQueryClient();

  const isSuperAdmin = user?.isSystemAdmin || userRoles.some((r) => normalizeRole(r.name) === 'superadmin')
    || normalizeRole(user?.role) === 'superadmin';

  const canManage = user?.isSystemAdmin || isSuperAdmin || userRoles.some((r) => {
    const n = normalizeRole(r.name);
    return n === 'admin' || n === 'superadmin';
  }) || normalizeRole(user?.role) === 'admin';

  const [selectedRoleId, setSelectedRoleId] = useState<string>();
  const [draftRows, setDraftRows] = useState<Record<string, EditableRow>>({});

  const { data: roles = [] } = useQuery({
    queryKey: ['rbac-roles'],
    queryFn: async () => (await rbacApi.getRoles()).data,
  });

  // Admin can manage all roles except superadmin
  const manageableRoles = useMemo(
    () => roles.filter((r) => isSuperAdmin ? true : normalizeRole(r.name) !== 'superadmin'),
    [roles, isSuperAdmin],
  );

  // Auto-select first role once loaded
  useEffect(() => {
    if (!selectedRoleId && manageableRoles.length > 0) {
      setSelectedRoleId(manageableRoles[0].id);
    }
  }, [manageableRoles, selectedRoleId]);

  const { data: roleMatrix = [], isLoading } = useQuery({
    queryKey: ['page-access-matrix', selectedRoleId],
    queryFn: async () => (await settingsApi.getRolePageAccessMatrix(selectedRoleId!)).data,
    enabled: !!selectedRoleId,
  });

  // Sync matrix into draft state
  useEffect(() => {
    const next: Record<string, EditableRow> = {};
    roleMatrix.forEach((row) => { next[row.page_key] = { ...row, key: row.page_key }; });
    setDraftRows(next);
  }, [roleMatrix]);

  const selectedRole = useMemo(
    () => manageableRoles.find((r) => r.id === selectedRoleId),
    [manageableRoles, selectedRoleId],
  );

  const initMutation = useMutation({
    mutationFn: ({ roleId, isAdmin }: { roleId: string; isAdmin: boolean }) =>
      settingsApi.initializeRolePageAccess(roleId, isAdmin),
    onSuccess: () => {
      message.success('Defaults initialized');
      queryClient.invalidateQueries({ queryKey: ['page-access-matrix', selectedRoleId] });
    },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to initialize'),
  });

  const saveMutation = useMutation({
    mutationFn: ({ roleId, accessList }: {
      roleId: string;
      accessList: Array<{ page_key: string; permissions: Partial<PageAccessPermissionSet> }>;
    }) => settingsApi.bulkSetRolePageAccess(roleId, accessList),
    onSuccess: () => {
      message.success('Page access saved');
      queryClient.invalidateQueries({ queryKey: ['page-access-matrix', selectedRoleId] });
      queryClient.invalidateQueries({ queryKey: ['my-page-access'] });
    },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to save'),
  });

  const updateRow = (pageKey: string, field: keyof PageAccessPermissionSet, value: boolean) => {
    setDraftRows((prev) => ({
      ...prev,
      [pageKey]: {
        ...prev[pageKey],
        // turning off view also clears all other actions
        ...(field === 'can_view' && !value
          ? { can_create: false, can_edit: false, can_delete: false, can_export: false }
          : {}),
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    if (!selectedRoleId) return;
    const accessList = Object.values(draftRows).map((row) => ({
      page_key: row.page_key,
      permissions: PERMISSION_KEYS.reduce<Partial<PageAccessPermissionSet>>((acc, k) => {
        acc[k] = row[k];
        return acc;
      }, {}),
    }));
    saveMutation.mutate({ roleId: selectedRoleId, accessList });
  };

  const tableData = useMemo(
    () => Object.values(draftRows)
      .filter((row) => !row.locked_by_subscription)
      .sort((a, b) => a.category.localeCompare(b.category) || a.page_name.localeCompare(b.page_name)),
    [draftRows],
  );

  const columns = [
    {
      title: 'Page',
      dataIndex: 'page_name',
      key: 'page_name',
      width: 200,
      render: (_: string, row: EditableRow) => (
        <div>
          <Text strong>{row.page_name}</Text>
          <div style={{ marginTop: 4 }}>
            <Tag style={{ fontSize: 11 }}>{row.category}</Tag>
          </div>
        </div>
      ),
    },
    ...PERMISSION_KEYS.map((field) => ({
      title: field.replace('can_', '').replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase()),
      key: field,
      align: 'center' as const,
      width: 90,
      render: (_: unknown, row: EditableRow) => (
        <Switch
          size="small"
          checked={row[field]}
          disabled={
            !canManage ||
            row.locked_by_subscription === true ||
            (field !== 'can_view' && !row.can_view)
          }
          onChange={(v) => updateRow(row.page_key, field, v)}
        />
      ),
    })),
  ];

  if (!canManage) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Admin access required"
        description="Only admin or superadmin can manage page access rules."
      />
    );
  }

  if (roles.length === 0) {
    return <Empty description="No roles found." />;
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="Pages locked by your subscription plan cannot be enabled here. Go to Manage Plan to upgrade."
      />

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Select
          style={{ width: 220 }}
          value={selectedRoleId}
          onChange={(v) => { setSelectedRoleId(v); setDraftRows({}); }}
          options={manageableRoles.map((r) => ({ value: r.id, label: r.name }))}
          placeholder="Select role"
        />
        <Button
          onClick={() => selectedRoleId && initMutation.mutate({
            roleId: selectedRoleId,
            isAdmin: ['admin', 'superadmin'].includes(normalizeRole(selectedRole?.name)),
          })}
          loading={initMutation.isPending}
          disabled={!selectedRoleId}
        >
          Initialize Defaults
        </Button>
        <Button
          type="primary"
          onClick={handleSave}
          loading={saveMutation.isPending}
          disabled={!selectedRoleId || Object.keys(draftRows).length === 0}
        >
          Save Changes
        </Button>
      </div>

      <Table
        rowKey="page_key"
        columns={columns}
        dataSource={tableData}
        loading={isLoading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        size="small"
      />
    </Space>
  );
}
