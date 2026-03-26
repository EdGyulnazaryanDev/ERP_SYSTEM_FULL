import { Card, Avatar, Typography, Form, Input, Button, notification, Tag } from 'antd';
import { UserOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/api/client';

const { Title, Text } = Typography;

export default function MyProfilePage() {
  const { user } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const updateProfileMutation = useMutation({
    mutationFn: (values: { first_name?: string; last_name?: string }) =>
      apiClient.patch('/users/profile/update', values),
    onSuccess: () => notification.success({ message: 'Profile updated' }),
    onError: () => notification.error({ message: 'Failed to update profile' }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (values: { currentPassword: string; newPassword: string }) =>
      apiClient.post('/users/change-password', {
        oldPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      notification.success({ message: 'Password changed' });
      passwordForm.resetFields();
    },
    onError: (e: any) => notification.error({ message: e?.response?.data?.message || 'Failed to change password' }),
  });

  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const actorColor: Record<string, string> = { staff: '#1677ff', customer: '#52c41a', supplier: '#fa8c16' };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <Title level={4} style={{ color: '#f0f6ff', marginBottom: 24 }}>My Profile</Title>

      {/* Identity card */}
      <Card style={{ background: 'rgba(8,25,40,0.6)', border: '1px solid rgba(134,166,197,0.12)', borderRadius: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Avatar size={72} style={{ background: 'linear-gradient(135deg,#1677ff,#722ed1)', fontSize: 28, flexShrink: 0 }}>
            {initials}
          </Avatar>
          <div>
            <Text style={{ color: '#f0f6ff', fontSize: 20, fontWeight: 700, display: 'block' }}>{user?.name || user?.email}</Text>
            <Text type="secondary" style={{ fontSize: 13 }}>{user?.email}</Text>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag color={actorColor[user?.actorType ?? 'staff']}>{user?.actorType ?? 'staff'}</Tag>
              {user?.role && <Tag>{user.role}</Tag>}
              {user?.isSystemAdmin && <Tag color="red">Platform Admin</Tag>}
            </div>
          </div>
        </div>
      </Card>

      {/* Edit profile — only for tenant staff users (system admins have no tenant) */}
      {user?.actorType === 'staff' && !user?.isSystemAdmin && (
        <Card
          title={<span style={{ color: '#f0f6ff' }}><UserOutlined /> Edit Profile</span>}
          style={{ background: 'rgba(8,25,40,0.5)', border: '1px solid rgba(134,166,197,0.1)', borderRadius: 12, marginBottom: 20 }}
        >
          <Form
            form={profileForm}
            layout="vertical"
            initialValues={{
              first_name: user?.name?.split(' ')[0] ?? '',
              last_name: user?.name?.split(' ').slice(1).join(' ') ?? '',
            }}
            onFinish={(v) => updateProfileMutation.mutate(v)}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item name="first_name" label={<span style={{ color: '#f0f6ff' }}>First Name</span>}>
                <Input />
              </Form.Item>
              <Form.Item name="last_name" label={<span style={{ color: '#f0f6ff' }}>Last Name</span>}>
                <Input />
              </Form.Item>
            </div>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateProfileMutation.isPending}>
              Save Profile
            </Button>
          </Form>
        </Card>
      )}

      {/* Change password */}
      {user?.isSystemAdmin ? (
        <Card
          title={<span style={{ color: '#f0f6ff' }}><LockOutlined /> Change Password</span>}
          style={{ background: 'rgba(8,25,40,0.5)', border: '1px solid rgba(134,166,197,0.1)', borderRadius: 12 }}
        >
          <Text type="secondary">Password management for platform admins is handled via the system admin seed or direct DB update.</Text>
        </Card>
      ) : (
      <Card
        title={<span style={{ color: '#f0f6ff' }}><LockOutlined /> Change Password</span>}
        style={{ background: 'rgba(8,25,40,0.5)', border: '1px solid rgba(134,166,197,0.1)', borderRadius: 12 }}
      >
        <Form form={passwordForm} layout="vertical" onFinish={(v) => changePasswordMutation.mutate(v)}>
          <Form.Item name="currentPassword" label={<span style={{ color: '#f0f6ff' }}>Current Password</span>} rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="newPassword" label={<span style={{ color: '#f0f6ff' }}>New Password</span>} rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={<span style={{ color: '#f0f6ff' }}>Confirm New Password</span>}
            dependencies={['newPassword']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<LockOutlined />} loading={changePasswordMutation.isPending}>
            Change Password
          </Button>
        </Form>
      </Card>
      )}
    </div>
  );
}
