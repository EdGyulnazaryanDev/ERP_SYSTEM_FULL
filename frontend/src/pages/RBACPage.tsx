import { useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Space,
  Tag,
  Transfer,
  Select,
  Checkbox,
  Spin,
  Typography,
  Alert,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyOutlined,
  SaveOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacApi, type Role, type Permission } from '@/api/rbac';
import { settingsApi, type PageAccessMatrixRow } from '@/api/settings';
import { useAccessControl } from '@/hooks/useAccessControl';

const { Text } = Typography;

function normalizeRole(name: string) {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

// ─── Page Access Tab ────────────────────────────────────────────────────────

function PageAccessTab({ roles, isSuperAdmin }: { roles: Role[]; isSuperAdmin: boolean }) {
  const { userRoles } = useAccessControl();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, Partial<PageAccessMatrixRow>>>({});

  // Admin can manage all roles except superadmin.
  // Superadmin can manage all roles.
  const editableRoles = roles.filter((r) => {
    const n = normalizeRole(r.name);
    if (isSuperAdmin) return true;
    return n !== 'superadmin';
  });

  // Pre-select the admin's own role if they only have one
  const myRoleIds = new Set(userRoles.map((r) => r.id));

  const { data: matrix = [], isLoading } = useQuery({
    queryKey: ['role-page-access', selectedRoleId],
    queryFn: async () => {
      const res = await settingsApi.getRolePageAccessMatrix(selectedRoleId!);
      return res.data;
    },
    enabled: !!selectedRoleId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId) return;
      const accessList = Object.entries(dirty).map(([page_key, perms]) => ({
        page_key,
        permissions: perms,
      }));
      await settingsApi.bulkSetRolePageAccess(selectedRoleId, accessList);
    },
    onSuccess: () => {
      message.success('Page access saved');
      setDirty({});
    },
    onError: () => message.error('Failed to save page access'),
  });

  const getVal = (row: PageAccessMatrixRow, field: keyof PageAccessMatrixRow) => {
    const override = dirty[row.page_key];
    if (override && field in override) return override[field as keyof typeof override];
    return row[field];
  };

  const toggle = (row: PageAccessMatrixRow, field: string, current: boolean) => {
    if (row.locked_by_subscription) return;
    setDirty((prev) => ({
      ...prev,
      [row.page_key]: { ...prev[row.page_key], [field]: !current },
    }));
  };

  const columns = [
    {
      title: 'Page',
      dataIndex: 'page_name',
      key: 'page_name',
      width: 180,
      render: (name: string, row: PageAccessMatrixRow) => (
        <div>
          <Text strong style={{ fontSize: 13, color: row.locked_by_subscription ? '#4a6070' : undefined }}>
            {name}
          </Text>
          {row.required_feature && (
            <div>
              <Tag color={row.locked_by_subscription ? 'default' : 'purple'} style={{ fontSize: 10, marginTop: 2 }}>
                {row.required_feature}
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (c: string, row: PageAccessMatrixRow) => (
        <Tag color={row.locked_by_subscription ? 'default' : undefined}>{c}</Tag>
      ),
    },
    {
      title: 'Plan',
      key: 'plan',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, row: PageAccessMatrixRow) =>
        row.locked_by_subscription ? (
          <LockOutlined style={{ color: '#4a6070' }} title="Not included in current plan" />
        ) : (
          <Badge status="success" />
        ),
    },
    ...(['can_view', 'can_create', 'can_edit', 'can_delete', 'can_export'] as const).map((field) => ({
      title: field.replace('can_', '').replace(/^\w/, (c) => c.toUpperCase()),
      key: field,
      width: 80,
      align: 'center' as const,
      render: (_: unknown, row: PageAccessMatrixRow) => {
        const val = getVal(row, field) as boolean;
        const locked = row.locked_by_subscription;
        return (
          <Checkbox
            checked={val}
            disabled={locked}
            onChange={() => toggle(row, field, val)}
            style={{ opacity: locked ? 0.35 : 1 }}
          />
        );
      },
    })),
  ];

  // Group by category
  const grouped = matrix.reduce<Record<string, PageAccessMatrixRow[]>>((acc, row) => {
    const cat = row.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(row);
    return acc;
  }, {});

  type TableRow = (PageAccessMatrixRow & { _isHeader?: boolean });
  const tableData: TableRow[] = Object.entries(grouped).flatMap(([cat, rows]) => [
    { page_key: `__header__${cat}`, page_name: cat, _isHeader: true } as TableRow,
    ...rows,
  ]);

  const selectedRole = editableRoles.find((r) => r.id === selectedRoleId);
  const isOwnRole = selectedRoleId ? myRoleIds.has(selectedRoleId) : false;

  return (
    <div>
      {!isSuperAdmin && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="You can manage page-level permissions for all roles except superadmin. Pages locked by your subscription plan cannot be enabled."
        />
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <Select
          placeholder="Select a role to manage page access"
          style={{ width: 280 }}
          value={selectedRoleId}
          onChange={(v) => { setSelectedRoleId(v); setDirty({}); }}
          options={editableRoles.map((r) => ({
            value: r.id,
            label: (
              <Space>
                {r.name}
                {myRoleIds.has(r.id) && <Tag color="blue" style={{ fontSize: 10 }}>My Role</Tag>}
              </Space>
            ),
          }))}
        />
        {selectedRoleId && Object.keys(dirty).length > 0 && (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Save Changes
          </Button>
        )}
        {selectedRole && isOwnRole && (
          <Tag color="blue">Managing your own role permissions</Tag>
        )}
      </div>

      {!selectedRoleId && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#8a9bb0' }}>
          Select a role above to manage its page-level permissions
        </div>
      )}

      {selectedRoleId && isLoading && (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      )}

      {selectedRoleId && !isLoading && (
        <Table
          dataSource={tableData}
          columns={columns}
          rowKey="page_key"
          pagination={false}
          size="small"
          rowClassName={(row) => row._isHeader ? 'rbac-category-header' : ''}
          onRow={(row) => ({
            style: row._isHeader
              ? { background: 'rgba(22, 119, 255, 0.06)', fontWeight: 700, pointerEvents: 'none' }
              : row.locked_by_subscription
              ? { opacity: 0.5 }
              : {},
          })}
        />
      )}
    </div>
  );
}

// ─── Main RBAC Page ──────────────────────────────────────────────────────────

export default function RBACPage() {
  const queryClient = useQueryClient();
  const { isPrivilegedUser, userRoles } = useAccessControl();
  const canManageRoles = isPrivilegedUser;

  // Determine if current user is superadmin (can manage superadmin role too)
  const isSuperAdmin = userRoles.some((r) => normalizeRole(r.name) === 'superadmin');

  const [roleForm] = Form.useForm();
  const [permForm] = Form.useForm();

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['rbac-roles'],
    queryFn: async () => {
      const res = await rbacApi.getRoles();
      return res.data;
    },
  });

  const { data: permissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ['rbac-permissions'],
    queryFn: async () => {
      const res = await rbacApi.getPermissions();
      return res.data;
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: rbacApi.createRole,
    onSuccess: () => {
      message.success('Role created');
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      setRoleModalOpen(false);
      roleForm.resetFields();
    },
    onError: () => message.error('Failed to create role'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => rbacApi.updateRole(id, data),
    onSuccess: () => {
      message.success('Role updated');
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      setRoleModalOpen(false);
      setEditingRole(null);
      roleForm.resetFields();
    },
    onError: () => message.error('Failed to update role'),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: rbacApi.deleteRole,
    onSuccess: () => {
      message.success('Role deleted');
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
    },
    onError: () => message.error('Failed to delete role'),
  });

  const createPermMutation = useMutation({
    mutationFn: rbacApi.createPermission,
    onSuccess: () => {
      message.success('Permission created');
      queryClient.invalidateQueries({ queryKey: ['rbac-permissions'] });
      setPermModalOpen(false);
      permForm.resetFields();
    },
    onError: () => message.error('Failed to create permission'),
  });

  const updatePermMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => rbacApi.updatePermission(id, data),
    onSuccess: () => {
      message.success('Permission updated');
      queryClient.invalidateQueries({ queryKey: ['rbac-permissions'] });
      setPermModalOpen(false);
      setEditingPerm(null);
      permForm.resetFields();
    },
    onError: () => message.error('Failed to update permission'),
  });

  const deletePermMutation = useMutation({
    mutationFn: rbacApi.deletePermission,
    onSuccess: () => {
      message.success('Permission deleted');
      queryClient.invalidateQueries({ queryKey: ['rbac-permissions'] });
    },
    onError: () => message.error('Failed to delete permission'),
  });

  const assignPermsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      rbacApi.assignPermissions(roleId, permissionIds),
    onSuccess: () => {
      message.success('Permissions assigned');
      setAssignModalOpen(false);
    },
    onError: () => message.error('Failed to assign permissions'),
  });

  const openRoleModal = (role?: Role) => {
    if (role) { setEditingRole(role); roleForm.setFieldsValue(role); }
    setRoleModalOpen(true);
  };

  const openPermModal = (perm?: Permission) => {
    if (perm) { setEditingPerm(perm); permForm.setFieldsValue(perm); }
    setPermModalOpen(true);
  };

  const openAssignModal = async (role: Role) => {
    setSelectedRole(role);
    const res = await rbacApi.getRolePermissions(role.id);
    setSelectedPermIds(res.data.map((p) => p.id));
    setAssignModalOpen(true);
  };

  const handleRoleSubmit = (values: any) => {
    if (editingRole) updateRoleMutation.mutate({ id: editingRole.id, data: values });
    else createRoleMutation.mutate(values);
  };

  const handlePermSubmit = (values: any) => {
    if (editingPerm) updatePermMutation.mutate({ id: editingPerm.id, data: values });
    else createPermMutation.mutate(values);
  };

  // Admin can only see/edit non-superadmin roles in the roles tab
  const visibleRoles = isSuperAdmin
    ? roles
    : roles.filter((r) => normalizeRole(r.name) !== 'superadmin');

  const roleColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Role) => (
        <Space>
          {text}
          {record.is_system && <Tag color="blue">System</Tag>}
        </Space>
      ),
    },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Role) => {
        const isProtected = normalizeRole(record.name) === 'superadmin' && !isSuperAdmin;
        return (
          <Space>
            <Button size="small" icon={<SafetyOutlined />} onClick={() => openAssignModal(record)}>
              Permissions
            </Button>
            {canManageRoles && !record.is_system && !isProtected && (
              <>
                <Button size="small" icon={<EditOutlined />} onClick={() => openRoleModal(record)} />
                <Button size="small" danger icon={<DeleteOutlined />}
                  onClick={() => Modal.confirm({
                    title: 'Delete Role', content: 'Are you sure?',
                    onOk: () => deleteRoleMutation.mutate(record.id),
                  })}
                />
              </>
            )}
          </Space>
        );
      },
    },
  ];

  const permColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Resource', dataIndex: 'resource', key: 'resource', render: (t: string) => <Tag color="blue">{t}</Tag> },
    { title: 'Action', dataIndex: 'action', key: 'action', render: (t: string) => <Tag color="green">{t}</Tag> },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Permission) => (
        <Space>
          {canManageRoles && (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => openPermModal(record)} />
              <Button size="small" danger icon={<DeleteOutlined />}
                onClick={() => Modal.confirm({
                  title: 'Delete Permission', content: 'Are you sure?',
                  onOk: () => deletePermMutation.mutate(record.id),
                })}
              />
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Access Governance</h1>
      <Card>
        <Tabs
          items={[
            {
              key: 'page-access',
              label: 'Page Access',
              children: <PageAccessTab roles={roles} isSuperAdmin={isSuperAdmin} />,
            },
            {
              key: 'roles',
              label: 'Roles',
              children: (
                <div>
                  {canManageRoles && isSuperAdmin && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openRoleModal()} className="mb-4">
                      Create Role
                    </Button>
                  )}
                  <Table columns={roleColumns} dataSource={visibleRoles} loading={rolesLoading} rowKey="id" />
                </div>
              ),
            },
            {
              key: 'permissions',
              label: 'Permissions',
              children: (
                <div>
                  {canManageRoles && isSuperAdmin && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openPermModal()} className="mb-4">
                      Create Permission
                    </Button>
                  )}
                  <Table columns={permColumns} dataSource={permissions} loading={permsLoading} rowKey="id" />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Role Modal — superadmin only */}
      <Modal
        title={editingRole ? 'Edit Role' : 'Create Role'}
        open={roleModalOpen}
        onCancel={() => { setRoleModalOpen(false); setEditingRole(null); roleForm.resetFields(); }}
        onOk={() => roleForm.submit()}
        confirmLoading={createRoleMutation.isPending || updateRoleMutation.isPending}
      >
        <Form form={roleForm} layout="vertical" onFinish={handleRoleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Permission Modal — superadmin only */}
      <Modal
        title={editingPerm ? 'Edit Permission' : 'Create Permission'}
        open={permModalOpen}
        onCancel={() => { setPermModalOpen(false); setEditingPerm(null); permForm.resetFields(); }}
        onOk={() => permForm.submit()}
        confirmLoading={createPermMutation.isPending || updatePermMutation.isPending}
      >
        <Form form={permForm} layout="vertical" onFinish={handlePermSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="resource" label="Resource" rules={[{ required: true, message: 'Required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="action" label="Action" rules={[{ required: true, message: 'Required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Permissions Modal */}
      <Modal
        title={`Assign Permissions — ${selectedRole?.name}`}
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        onOk={() => {
          if (selectedRole) assignPermsMutation.mutate({ roleId: selectedRole.id, permissionIds: selectedPermIds });
        }}
        width={800}
        confirmLoading={assignPermsMutation.isPending}
      >
        <Transfer
          dataSource={permissions.map((p) => ({ key: p.id, title: p.name, description: `${p.resource}:${p.action}` }))}
          titles={['Available', 'Assigned']}
          targetKeys={selectedPermIds}
          onChange={(nextTargetKeys) => setSelectedPermIds(nextTargetKeys as string[])}
          render={(item) => item.title || ''}
          listStyle={{ width: 350, height: 400 }}
        />
      </Modal>
    </div>
  );
}
