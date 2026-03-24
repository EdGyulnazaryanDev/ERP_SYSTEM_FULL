import { useState } from 'react';
import {
  Card,
  Table,
  Space,
  Modal,
  Button,
  Form,
  Input,
  Switch,
  Popconfirm,
  message,
  Select,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, roleService, type PaginatedResponse } from '@/services';
import { useAccessControl } from '@/hooks/useAccessControl';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
}

export default function UsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ page: 1, pageSize: 10, search: '' });
  const { canPerform } = useAccessControl();
  const canCreate = canPerform('users', 'create');
  const canEdit = canPerform('users', 'edit');
  const canDelete = canPerform('users', 'delete');

  const { data: users, isLoading, error, isError } = useQuery<PaginatedResponse<User>>({
    queryKey: ['users', filters],
    queryFn: async () => {
      try {
        const res = await userService.getAll({ page: filters.page, pageSize: filters.pageSize, search: filters.search });
        return res.data;
      } catch (e: any) {
        throw e;
      }
    },
    retry: 1,
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await roleService.getAll();
      // roleService.getAll returns AxiosResponse<Role[]>
      return res.data;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (payload: any) => {
      const { userData } = payload;
      return userService.create(userData);
    },
    onSuccess: async (res: any, vars: any) => {
      try {
        message.success('User created successfully');

        // if role was selected, assign it
        const created = res.data;
        const { roleId } = vars;
        if (roleId && created?.id) {
          await roleService.assignRoleToUser(roleId, created.id);
          message.success('Role assigned successfully');
        }

        // Close modal and reset form
        setIsModalOpen(false);
        setTimeout(() => form.resetFields(), 0);

        // Invalidate queries to refresh the list
        await queryClient.invalidateQueries({ queryKey: ['users'] });
      } catch (e: any) {
        console.error('Error in user creation success handler:', e);
        message.error(e?.response?.data?.message || 'Error during post-creation steps');

        // Still close the modal even if role assignment fails
        setIsModalOpen(false);
        setTimeout(() => form.resetFields(), 0);
        await queryClient.invalidateQueries({ queryKey: ['users'] });
      }
    },
    onError: (e: any) => {
      console.error('User creation error:', e);
      message.error(e?.response?.data?.message || 'Failed to create user');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => userService.update(id, data),
    onSuccess: async (_res: any, vars: any) => {
      message.success('User updated');
      setIsModalOpen(false);
      setEditingUser(null);
      setTimeout(() => form.resetFields(), 0);
      try {
        if (vars?.data?.role_id) {
          await roleService.assignRoleToUser(vars.data.role_id, vars.id);
        }
      } catch (e) {
        // ignore
      }
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || 'Failed to update user');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => {
      message.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || 'Failed to delete user');
    },
  });

  const openCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
    setTimeout(() => form.resetFields(), 0);
  };

  const openEdit = async (u: User) => {
    setEditingUser(u);
    form.setFieldsValue(u);
    setIsModalOpen(true);
  };

  const handleSubmit = (values: any) => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data: values });
    } else {
      // Separate role_id from user data (role assignment happens after creation)
      const { role_id, ...userData } = values;
      createUserMutation.mutate({ userData, roleId: role_id });
    }
  };

  const columns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Name',
      key: 'name',
      render: (_: unknown, r: User) => `${r.first_name || ''} ${r.last_name || ''}`,
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v: boolean) => (v ? 'Yes' : 'No'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, r: User) => (
        <Space>
          {canEdit && <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button>}
          {canDelete && (
            <Popconfirm title={`Delete ${r.email}?`} onConfirm={() => deleteUserMutation.mutate(r.id)}>
              <Button type="link" danger icon={<DeleteOutlined />}>Delete</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ minHeight: '400px', padding: '20px' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Users Management</h2>
        <Space>
          <Input.Search
            placeholder="Search users"
            allowClear
            onSearch={(q) => setFilters({ ...filters, search: q as string, page: 1 })}
            style={{ width: 240 }}
          />
          {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create User</Button>}
        </Space>
      </div>

      {isError && (
        <Card style={{ marginBottom: 16, borderColor: '#ff4d4f' }}>
          <p style={{ color: '#ff4d4f' }}>
            Error loading users: {(error as any)?.message || 'Unknown error'}
          </p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}>
            Retry
          </Button>
        </Card>
      )}

      <Card>
        {isLoading && <p>Loading users...</p>}
        {!isLoading && !isError && (
          <Table
            columns={columns}
            dataSource={users?.data || []}
            loading={isLoading}
            rowKey="id"
            pagination={{
              current: users?.page || filters.page,
              pageSize: users?.pageSize || filters.pageSize,
              total: users?.total || 0,
              onChange: (page, pageSize) => setFilters({ ...filters, page, pageSize }),
            }}
          />
        )}
      </Card>

      <Modal title={editingUser ? 'Edit User' : 'Create User'} open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} forceRender>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="first_name" label="First name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Last name">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role_id" label="Role">
            <Select allowClear placeholder="Assign role to user">
              {(roles || []).map((r: any) => (
                <Select.Option key={r.id} value={r.id}>{r.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createUserMutation.isPending || updateUserMutation.isPending}>
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
