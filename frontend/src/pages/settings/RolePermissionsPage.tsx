import { useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, message, Tag, Transfer, Tabs, Descriptions } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined, LinkOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleService, type Role } from '@/services/RoleService';
import { permissionService, type Permission } from '@/services/PermissionService';
import { rolePermissionService } from '@/services/RolePermissionService';
import type { TransferProps } from 'antd';

export default function RolePermissionsPage() {
  const [form] = Form.useForm();
  const [permForm] = Form.useForm();
  const queryClient = useQueryClient();
  
  // Modal states
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  // Edit states
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Fetch data
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await roleService.getAll();
      return response.data;
    },
  });

  const { data: permissions, isLoading: permsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await permissionService.getAll();
      return response.data;
    },
  });

  const { data: rolePermissions } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const response = await rolePermissionService.getAll();
      return response.data;
    },
  });

  // Role mutations
  const createRoleMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      roleService.create(data),
    onSuccess: () => {
      message.success('Role created successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      closeRoleModal();
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to create role');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string } }) =>
      roleService.update(id, data),
    onSuccess: () => {
      message.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      closeRoleModal();
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to update role');
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => roleService.delete(id),
    onSuccess: () => {
      message.success('Role deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['roles', 'role-permissions'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete role');
    },
  });

  // Permission mutations
  const createPermMutation = useMutation({
    mutationFn: (data: { name: string; resource: string; action: string; description?: string }) =>
      permissionService.create(data),
    onSuccess: () => {
      message.success('Permission created successfully');
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      closePermModal();
    },
  });

  const updatePermMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; resource: string; action: string; description?: string }> }) =>
      permissionService.update(id, data),
    onSuccess: () => {
      message.success('Permission updated successfully');
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      closePermModal();
    },
  });

  const deletePermMutation = useMutation({
    mutationFn: (id: string) => permissionService.delete(id),
    onSuccess: () => {
      message.success('Permission deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['permissions', 'role-permissions'] });
    },
  });

  // Assignment mutations
  const assignPermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      permissionService.assignToRole(roleId, permissionIds),
    onSuccess: () => {
      message.success('Permissions assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      setIsAssignModalOpen(false);
    },
  });

  // Role handlers
  const openRoleModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      form.setFieldsValue(role);
    }
    setIsRoleModalOpen(true);
  };

  const closeRoleModal = () => {
    setIsRoleModalOpen(false);
    setEditingRole(null);
    form.resetFields();
  };

  const handleRoleSubmit = (values: { name: string; description?: string }) => {
    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data: values });
    } else {
      createRoleMutation.mutate(values);
    }
  };

  // Permission handlers
  const openPermModal = (perm?: Permission) => {
    if (perm) {
      setEditingPerm(perm);
      permForm.setFieldsValue(perm);
    }
    setIsPermModalOpen(true);
  };

  const closePermModal = () => {
    setIsPermModalOpen(false);
    setEditingPerm(null);
    permForm.resetFields();
  };

  const handlePermSubmit = (values: { name: string; resource: string; action: string; description?: string }) => {
    if (editingPerm) {
      updatePermMutation.mutate({ id: editingPerm.id, data: values });
    } else {
      createPermMutation.mutate(values);
    }
  };

  // Assignment handlers
  const openAssignModal = async (role: Role) => {
    setSelectedRole(role);
    const response = await rolePermissionService.getByRole(role.id);
    setSelectedPermissions(response.data.map((p: Permission) => p.id));
    setIsAssignModalOpen(true);
  };

  const handlePermissionChange: TransferProps['onChange'] = (targetKeys) => {
    setSelectedPermissions(targetKeys as string[]);
  };

  const handleAssignPermissions = () => {
    if (selectedRole) {
      assignPermissionsMutation.mutate({
        roleId: selectedRole.id,
        permissionIds: selectedPermissions,
      });
    }
  };

  // Table columns
  const roleColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Role) => (
        <Space>
          <span className="font-medium">{text}</span>
          {record.is_system && <Tag color="blue">System</Tag>}
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_: unknown, record: Role) => {
        const count = rolePermissions?.filter((rp: any) => rp.role_id === record.id).length || 0;
        return <Tag color="green">{count} permissions</Tag>;
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Role) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            onClick={() => openAssignModal(record)}
          >
            Manage Permissions
          </Button>
          {!record.is_system && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openRoleModal(record)}
              >
                Edit
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: 'Delete Role',
                    content: 'Are you sure you want to delete this role?',
                    onOk: () => deleteRoleMutation.mutate(record.id),
                  });
                }}
              >
                Delete
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const permissionColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Resource',
      dataIndex: 'resource',
      key: 'resource',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (text: string) => <Tag color="green">{text}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Roles',
      key: 'roles',
      render: (_: unknown, record: Permission) => {
        const count = rolePermissions?.filter((rp: any) => rp.permission_id === record.id).length || 0;
        return <Tag color="purple">{count} roles</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Permission) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openPermModal(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: 'Delete Permission',
                content: 'Are you sure you want to delete this permission?',
                onOk: () => deletePermMutation.mutate(record.id),
              });
            }}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'roles',
      label: 'Roles',
      children: (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Role Management</h3>
              <p className="text-sm text-gray-500">Manage roles and their permissions. Role names must be unique per tenant.</p>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openRoleModal()}
            >
              Create Role
            </Button>
          </div>
          <Table
            columns={roleColumns}
            dataSource={roles}
            loading={rolesLoading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </div>
      ),
    },
    {
      key: 'permissions',
      label: 'Permissions',
      children: (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Permission Management</h3>
              <p className="text-sm text-gray-500">Manage permissions. Permissions can be duplicated across different resources.</p>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openPermModal()}
            >
              Create Permission
            </Button>
          </div>
          <Table
            columns={permissionColumns}
            dataSource={permissions}
            loading={permsLoading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </div>
      ),
    },
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <div className="space-y-4">
          <Card title="System Statistics">
            <Descriptions column={2}>
              <Descriptions.Item label="Total Roles">{roles?.length || 0}</Descriptions.Item>
              <Descriptions.Item label="Total Permissions">{permissions?.length || 0}</Descriptions.Item>
              <Descriptions.Item label="System Roles">
                {roles?.filter(r => r.is_system).length || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Custom Roles">
                {roles?.filter(r => !r.is_system).length || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Total Assignments">
                {rolePermissions?.length || 0}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="System Roles">
            <div className="space-y-2">
              {roles?.filter(r => r.is_system).map(role => (
                <div key={role.id} className="p-3 border rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{role.name}</span>
                      <Tag color="blue" className="ml-2">System</Tag>
                    </div>
                    <Button
                      size="small"
                      icon={<SafetyOutlined />}
                      onClick={() => openAssignModal(role)}
                    >
                      View Permissions
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Role & Permission Management</h1>
        <p className="text-gray-600">Manage your organization's access control system</p>
      </div>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      {/* Role Modal */}
      <Modal
        title={editingRole ? 'Edit Role' : 'Create Role'}
        open={isRoleModalOpen}
        onCancel={closeRoleModal}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleRoleSubmit}>
          <Form.Item
            name="name"
            label="Role Name"
            rules={[
              { required: true, message: 'Please enter role name' },
              { pattern: /^[a-zA-Z0-9\s-_]+$/, message: 'Only letters, numbers, spaces, hyphens and underscores allowed' }
            ]}
            extra="Role name must be unique per tenant"
          >
            <Input placeholder="e.g., Manager, Sales Rep" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Describe the role's purpose and responsibilities" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createRoleMutation.isPending || updateRoleMutation.isPending}
              >
                {editingRole ? 'Update' : 'Create'}
              </Button>
              <Button onClick={closeRoleModal}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Permission Modal */}
      <Modal
        title={editingPerm ? 'Edit Permission' : 'Create Permission'}
        open={isPermModalOpen}
        onCancel={closePermModal}
        footer={null}
        width={600}
      >
        <Form form={permForm} layout="vertical" onFinish={handlePermSubmit}>
          <Form.Item
            name="name"
            label="Permission Name"
            rules={[{ required: true, message: 'Please enter permission name' }]}
            extra="Permissions can be duplicated for different resources"
          >
            <Input placeholder="e.g., View Products, Edit Orders" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="resource"
              label="Resource"
              rules={[{ required: true, message: 'Please enter resource' }]}
            >
              <Input placeholder="e.g., products, orders, users" />
            </Form.Item>

            <Form.Item
              name="action"
              label="Action"
              rules={[{ required: true, message: 'Please enter action' }]}
            >
              <Input placeholder="e.g., read, create, update, delete" />
            </Form.Item>
          </div>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Describe what this permission allows" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createPermMutation.isPending || updatePermMutation.isPending}
              >
                {editingPerm ? 'Update' : 'Create'}
              </Button>
              <Button onClick={closePermModal}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Permissions Modal */}
      <Modal
        title={`Manage Permissions - ${selectedRole?.name}`}
        open={isAssignModalOpen}
        onCancel={() => setIsAssignModalOpen(false)}
        onOk={handleAssignPermissions}
        okText="Save Permissions"
        width={800}
        confirmLoading={assignPermissionsMutation.isPending}
      >
        <Transfer
          dataSource={permissions?.map((p: Permission) => ({
            key: p.id,
            title: p.name,
            description: `${p.resource}:${p.action}`,
          }))}
          titles={['Available', 'Assigned']}
          targetKeys={selectedPermissions}
          onChange={handlePermissionChange}
          render={(item) => (
            <div>
              <div>{item.title}</div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
          )}
          listStyle={{
            width: 350,
            height: 400,
          }}
          showSearch
          filterOption={(inputValue, item) =>
            item.title?.toLowerCase().includes(inputValue.toLowerCase()) ||
            item.description?.toLowerCase().includes(inputValue.toLowerCase())
          }
        />
      </Modal>
    </div>
  );
}
