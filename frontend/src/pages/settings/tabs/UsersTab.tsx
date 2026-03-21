import { useState } from 'react';
import { Card, Table, Space, Modal, Button, Transfer, message, Tag } from 'antd';
import { SafetyOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services';
import { roleService, type Role } from '@/services/RoleService';
import { useAccessControl } from '@/hooks/useAccessControl';
import type { TransferProps } from 'antd';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
}

export default function UsersTab() {
  const queryClient = useQueryClient();
  const { canPerform } = useAccessControl();
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await userService.getAll();
      return response.data.data;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await roleService.getAll();
      return response.data; // roleService returns an array of Roles not data.data
    },
  });

  const assignRolesMutation = useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      // Get current roles
      const currentRoles = await roleService.getUserRoles(userId);
      const currentRoleIds = currentRoles.data.map((r: Role) => r.id);

      // Remove roles that are no longer selected
      for (const roleId of currentRoleIds) {
        if (!roleIds.includes(roleId)) {
          await roleService.removeRoleFromUser(roleId, userId);
        }
      }

      // Add new roles
      for (const roleId of roleIds) {
        if (!currentRoleIds.includes(roleId)) {
          await roleService.assignRoleToUser(roleId, userId);
        }
      }
    },
    onSuccess: () => {
      message.success('User roles updated successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsRoleModalOpen(false);
    },
  });

  const openRoleModal = async (user: User) => {
    setSelectedUser(user);
    const response = await roleService.getUserRoles(user.id);
    setSelectedRoles(response.data.map((r: Role) => r.id));
    setIsRoleModalOpen(true);
  };

  const handleRoleChange: TransferProps['onChange'] = (targetKeys) => {
    setSelectedRoles(targetKeys as string[]);
  };

  const handleAssignRoles = () => {
    if (selectedUser) {
      assignRolesMutation.mutate({
        userId: selectedUser.id,
        roleIds: selectedRoles,
      });
    }
  };

  const canManageUserRoles = canPerform('users', 'edit');

  const columns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Name',
      key: 'name',
      render: (_: unknown, record: User) =>
        `${record.first_name} ${record.last_name}`,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Space>
          {canManageUserRoles && (
            <Button
              type="link"
              icon={<SafetyOutlined />}
              onClick={() => openRoleModal(record)}
            >
              Manage Roles
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">User Management</h2>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={users}
          loading={isLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Roles Modal */}
      {canManageUserRoles && (
        <Modal
          title={`Manage Roles - ${selectedUser?.email}`}
          open={isRoleModalOpen}
          onCancel={() => setIsRoleModalOpen(false)}
          onOk={handleAssignRoles}
          okText="Save Roles"
          width={800}
          confirmLoading={assignRolesMutation.isPending}
        >
          <Transfer
            dataSource={roles?.map((r: Role) => ({
              key: r.id,
              title: r.name,
              description: r.description || '',
              disabled: r.is_system,
            }))}
            titles={['Available', 'Assigned']}
            targetKeys={selectedRoles}
            onChange={handleRoleChange}
            render={(item) => (
              <div>
                <div>{item.title}</div>
                {item.description && (
                  <div className="text-xs text-gray-500">{item.description}</div>
                )}
              </div>
            )}
            listStyle={{
              width: 350,
              height: 400,
            }}
          />
        </Modal>
      )}
    </div>
  );
}
