import { useState } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, Typography, notification, Tooltip, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminTenantsApi, type TenantRecord } from '@/api/admin';

const { Title, Text } = Typography;

export default function TenantsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<TenantRecord | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => {
      const res = await adminTenantsApi.list({ limit: 100 });
      return res.data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-tenants'] });

  const createMutation = useMutation({
    mutationFn: (values: { name: string; domain?: string }) => adminTenantsApi.create(values),
    onSuccess: () => { notification.success({ message: 'Tenant created' }); setCreateOpen(false); form.resetFields(); invalidate(); },
    onError: () => notification.error({ message: 'Failed to create tenant' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: { name?: string; domain?: string } }) =>
      adminTenantsApi.update(id, values),
    onSuccess: () => { notification.success({ message: 'Tenant updated' }); setEditTenant(null); form.resetFields(); invalidate(); },
    onError: () => notification.error({ message: 'Failed to update tenant' }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => adminTenantsApi.deactivate(id),
    onSuccess: () => { notification.success({ message: 'Tenant deactivated' }); invalidate(); },
    onError: () => notification.error({ message: 'Failed to deactivate tenant' }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => adminTenantsApi.activate(id),
    onSuccess: () => { notification.success({ message: 'Tenant activated' }); invalidate(); },
    onError: () => notification.error({ message: 'Failed to activate tenant' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminTenantsApi.delete(id),
    onSuccess: () => { notification.success({ message: 'Tenant and all data deleted' }); invalidate(); },
    onError: () => notification.error({ message: 'Failed to delete tenant' }),
  });

  const handleSubmit = (values: { name: string; domain?: string }) => {
    if (editTenant) {
      updateMutation.mutate({ id: editTenant.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const openEdit = (t: TenantRecord) => {
    setEditTenant(t);
    form.setFieldsValue({ name: t.name, domain: t.domain ?? '' });
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong style={{ color: '#f0f6ff' }}>{name}</Text>,
    },
    {
      title: 'Domain',
      dataIndex: 'domain',
      key: 'domain',
      render: (d: string | null) => d ? <Text type="secondary">{d}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Plan',
      dataIndex: 'planName',
      key: 'planName',
      render: (p: string | null) => p ? <Tag color="blue">{p}</Tag> : <Tag>No plan</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => new Date(d).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: TenantRecord) => (
        <Space>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(record)} style={{ color: '#1677ff' }} />
          </Tooltip>
          {record.isActive ? (
            <Tooltip title="Deactivate">
              <Button type="text" icon={<StopOutlined />} danger
                onClick={() => Modal.confirm({
                  title: `Deactivate "${record.name}"?`,
                  content: 'Tenant users will lose access. Data is preserved.',
                  okText: 'Deactivate', okType: 'danger',
                  onOk: () => deactivateMutation.mutate(record.id),
                })}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Activate">
              <Button type="text" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }}
                onClick={() => Modal.confirm({
                  title: `Activate "${record.name}"?`,
                  content: 'Tenant users will regain access.',
                  okText: 'Activate',
                  onOk: () => activateMutation.mutate(record.id),
                })}
              />
            </Tooltip>
          )}
          <Tooltip title="Delete All Data">
            <Popconfirm
              title={`Delete "${record.name}" and ALL data?`}
              description="This will permanently delete the tenant and all related data (users, transactions, products, etc.). This action cannot be undone!"
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Yes, Delete Everything"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" icon={<DeleteOutlined />} danger loading={deleteMutation.isPending} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const isModalOpen = createOpen || !!editTenant;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#f0f6ff' }}>Tenants</Title>
          <Text type="secondary">Manage all companies registered on the platform</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditTenant(null); form.resetFields(); setCreateOpen(true); }}>
          New Tenant
        </Button>
      </div>

      <Table
        dataSource={data?.data ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        style={{ background: 'rgba(8, 25, 40, 0.5)', borderRadius: 12, border: '1px solid rgba(134, 166, 197, 0.1)' }}
      />

      <Modal
        title={editTenant ? 'Edit Tenant' : 'New Tenant'}
        open={isModalOpen}
        onCancel={() => { setCreateOpen(false); setEditTenant(null); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editTenant ? 'Save' : 'Create'}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Company Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="Acme Corp" />
          </Form.Item>
          <Form.Item name="domain" label="Domain (optional)">
            <Input placeholder="acme.example.com" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
