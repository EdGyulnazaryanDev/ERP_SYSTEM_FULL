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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacApi, type Role, type Permission } from '@/api/rbac';
import { settingsApi, type PageAccessMatrixRow } from '@/api/settings';
import { useAccessControl } from '@/hooks/useAccessControl';

const { Text } = Typography;

// ─── Page Access Tab ────────────────────────────────────────────────────────

function PageAccessTab({ roles }: { roles: Role[] }) {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, Partial<PageAccessMatrixRow>>>({});

  // Exclude Admin (tenant admin) and superadmin from the list — they have full access
  const editableRoles = roles.filter((r) => {
    const n = r.name.trim().toLowerCase().replace(/[\s_-]+/g, '');
    return n !== 'admin' && n !== 'superadmin';
  });

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

  const toggle = (pageKey: string, field: string, current: boolean) => {
    setDirty((prev) => ({
      ...prev,
      [pageKey]: { ...prev[pageKey], [field]: !current },
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
          <Text strong style={{ fontSize: 13 }}>{name}</Text>
          {row.required_feature && (
            <div><Tag color="purple" style={{ fontSize: 10, marginTop: 2 }}>{row.required_feature}</Tag></div>
          )}
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (c: string) => <Tag>{c}</Tag>,
    },
    ...(['can_view', 'can_create', 'can_edit', 'can_delete', 'can_export'] as const).map((field) => ({
      title: field.replace('can_', '').replace(/^\w/, (c) => c.toUpperCase()),
      key: field,
      width: 80,
      align: 'center' as const,
      render: (_: unknown, row: PageAccessMatrixRow) => {
        const val = getVal(row, field) as boolean;
        return (
          <Checkbox
            checked={val}
            onChange={() => toggle(row.page_key, field, val)}
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

  const tableData = Object.entries(grouped).flatMap(([cat, rows]) => [
    { page_key: `__header__${cat}`, page_name: cat, _isHeader: true } as any,
    ...rows,
  ]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <Select
          placeholder="Select a role to manage page access"
          style={{ width: 280 }}
          value={selectedRoleId}
          onChange={(v) => { setSelectedRoleId(v); setDirty({}); }}
          options={editableRoles.map((r) => ({ value: r.id, label: r.name }))}
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
  const { isPrivilegedUser } = useAccessControl();
  const canManageRoles = isPrivilegedUser;
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
      render: (_: any, record: Role) => (
        <Space>
          <Button size="small" icon={<SafetyOutlined />} onClick={() => openAssignModal(record)}>
            Permissions
          </Button>
          {canManageRoles && !record.is_system && (
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
      ),
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
      <h1 className="text-2xl font-bold mb-6">Roles & Permissions</h1>
      <Card>
        <Tabs
          items={[
            {
              key: 'roles',
              label: 'Roles',
              children: (
                <div>
                  {canManageRoles && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openRoleModal()} className="mb-4">
                      Create Role
                    </Button>
                  )}
                  <Table columns={roleColumns} dataSource={roles} loading={rolesLoading} rowKey="id" />
                </div>
              ),
            },
            {
              key: 'permissions',
              label: 'Permissions',
              children: (
                <div>
                  {canManageRoles && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openPermModal()} className="mb-4">
                      Create Permission
                    </Button>
                  )}
                  <Table columns={permColumns} dataSource={permissions} loading={permsLoading} rowKey="id" />
                </div>
              ),
            },
            {
              key: 'page-access',
              label: 'Page Access',
              children: <PageAccessTab roles={roles} />,
            },
          ]}
        />
      </Card>

      {/* Role Modal */}
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

      {/* Permission Modal */}
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
