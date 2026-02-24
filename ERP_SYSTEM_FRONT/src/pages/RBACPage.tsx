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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacApi, type Role, type Permission } from '@/api/rbac';

export default function RBACPage() {
  const queryClient = useQueryClient();
  const [roleForm] = Form.useForm();
  const [permForm] = Form.useForm();

  // Modals
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Edit states
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);

  // Queries
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

  // Role mutations
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
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      rbacApi.updateRole(id, data),
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

  // Permission mutations
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
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      rbacApi.updatePermission(id, data),
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

  // Handlers
  const openRoleModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      roleForm.setFieldsValue(role);
    }
    setRoleModalOpen(true);
  };

  const openPermModal = (perm?: Permission) => {
    if (perm) {
      setEditingPerm(perm);
      permForm.setFieldsValue(perm);
    }
    setPermModalOpen(true);
  };

  const openAssignModal = async (role: Role) => {
    setSelectedRole(role);
    const res = await rbacApi.getRolePermissions(role.id);
    setSelectedPermIds(res.data.map((p) => p.id));
    setAssignModalOpen(true);
  };

  const handleRoleSubmit = (values: any) => {
    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data: values });
    } else {
      createRoleMutation.mutate(values);
    }
  };

  const handlePermSubmit = (values: any) => {
    if (editingPerm) {
      updatePermMutation.mutate({ id: editingPerm.id, data: values });
    } else {
      createPermMutation.mutate(values);
    }
  };

  const handleAssignSubmit = () => {
    if (selectedRole) {
      assignPermsMutation.mutate({
        roleId: selectedRole.id,
        permissionIds: selectedPermIds,
      });
    }
  };

  // Tables
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
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Role) => (
        <Space>
          <Button
            size="small"
            icon={<SafetyOutlined />}
            onClick={() => openAssignModal(record)}
          >
            Permissions
          </Button>
          {!record.is_system && (
            <>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => openRoleModal(record)}
              />
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: 'Delete Role',
                    content: 'Are you sure?',
                    onOk: () => deleteRoleMutation.mutate(record.id),
                  });
                }}
              />
            </>
          )}
        </Space>
      ),
    },
  ];

  const permColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
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
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Permission) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openPermModal(record)}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: 'Delete Permission',
                content: 'Are you sure?',
                onOk: () => deletePermMutation.mutate(record.id),
              });
            }}
          />
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
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openRoleModal()}
                    className="mb-4"
                  >
                    Create Role
                  </Button>
                  <Table
                    columns={roleColumns}
                    dataSource={roles}
                    loading={rolesLoading}
                    rowKey="id"
                  />
                </div>
              ),
            },
            {
              key: 'permissions',
              label: 'Permissions',
              children: (
                <div>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openPermModal()}
                    className="mb-4"
                  >
                    Create Permission
                  </Button>
                  <Table
                    columns={permColumns}
                    dataSource={permissions}
                    loading={permsLoading}
                    rowKey="id"
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Role Modal */}
      <Modal
        title={editingRole ? 'Edit Role' : 'Create Role'}
        open={roleModalOpen}
        onCancel={() => {
          setRoleModalOpen(false);
          setEditingRole(null);
          roleForm.resetFields();
        }}
        onOk={() => roleForm.submit()}
        confirmLoading={createRoleMutation.isPending || updateRoleMutation.isPending}
      >
        <Form form={roleForm} layout="vertical" onFinish={handleRoleSubmit}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Required' }]}
          >
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
        onCancel={() => {
          setPermModalOpen(false);
          setEditingPerm(null);
          permForm.resetFields();
        }}
        onOk={() => permForm.submit()}
        confirmLoading={createPermMutation.isPending || updatePermMutation.isPending}
      >
        <Form form={permForm} layout="vertical" onFinish={handlePermSubmit}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="resource"
            label="Resource"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="action"
            label="Action"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Permissions Modal */}
      <Modal
        title={`Assign Permissions - ${selectedRole?.name}`}
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        onOk={handleAssignSubmit}
        width={800}
        confirmLoading={assignPermsMutation.isPending}
      >
        <Transfer
          dataSource={permissions.map((p) => ({
            key: p.id,
            title: p.name,
            description: `${p.resource}:${p.action}`,
          }))}
          titles={['Available', 'Assigned']}
          targetKeys={selectedPermIds}
          onChange={setSelectedPermIds}
          render={(item) => item.title || ''}
          listStyle={{ width: 350, height: 400 }}
        />
      </Modal>
    </div>
  );
}
