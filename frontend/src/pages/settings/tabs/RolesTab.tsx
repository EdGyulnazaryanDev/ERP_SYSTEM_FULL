import { useState } from 'react';
import { Button, Card, Table, Space, Modal, Form, Input, message, Tag, Transfer } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleService, type Role } from '@/services/RoleService';
import { permissionService, type Permission } from '@/services/PermissionService';
import type { TransferProps } from 'antd';

export default function RolesTab() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await roleService.getAll();
      return response.data;
    },
  });

  const { data: permissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await permissionService.getAll();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      roleService.create(data),
    onSuccess: () => {
      message.success('Role created successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string } }) =>
      roleService.update(id, data),
    onSuccess: () => {
      message.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roleService.delete(id),
    onSuccess: () => {
      message.success('Role deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      message.error(error.response?.data?.message || 'Failed to delete role');
    },
  });

  const assignPermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      permissionService.assignToRole(roleId, permissionIds),
    onSuccess: () => {
      message.success('Permissions assigned successfully');
      setIsPermissionModalOpen(false);
    },
  });

  const openModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      form.setFieldsValue(role);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
    form.resetFields();
  };

  const handleSubmit = (values: { name: string; description?: string }) => {
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const openPermissionModal = async (role: Role) => {
    setSelectedRole(role);
    const response = await permissionService.getRolePermissions(role.id);
    setSelectedPermissions(response.data.map((p: Permission) => p.id));
    setIsPermissionModalOpen(true);
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

  const columns = [
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
            icon={<SafetyOutlined />}
            onClick={() => openPermissionModal(record)}
          >
            Permissions
          </Button>
          {!record.is_system && (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => openModal(record)}
              >
                Edit
              </Button>
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  Modal.confirm({
                    title: 'Delete Role',
                    content: 'Are you sure you want to delete this role?',
                    onOk: () => deleteMutation.mutate(record.id),
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

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Roles Management</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
        >
          Create Role
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={roles}
          loading={isLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingRole ? 'Edit Role' : 'Create Role'}
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Role Name"
            rules={[{ required: true, message: 'Please enter role name' }]}
          >
            <Input placeholder="e.g., Manager" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Role description" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingRole ? 'Update' : 'Create'}
              </Button>
              <Button onClick={closeModal}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        title={`Manage Permissions - ${selectedRole?.name}`}
        open={isPermissionModalOpen}
        onCancel={() => setIsPermissionModalOpen(false)}
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
        />
      </Modal>
    </div>
  );
}
