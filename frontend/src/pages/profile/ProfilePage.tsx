import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, Row, Col, Avatar, Typography, Form, Input, Button,
  Divider, Tag, message, Spin,
} from 'antd';
import {
  UserOutlined, MailOutlined, LockOutlined, EditOutlined,
  SaveOutlined, CrownOutlined, SafetyOutlined,
} from '@ant-design/icons';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { useAccessControl } from '@/hooks/useAccessControl';

const { Title, Text } = Typography;

const CARD = {
  background: 'rgba(8,25,40,0.6)',
  border: '1px solid rgba(134,166,197,0.12)',
  borderRadius: 16,
};
const HEAD = { borderBottom: '1px solid rgba(134,166,197,0.1)', background: 'transparent' };

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  isSystemAdmin: boolean;
  created_at: string;
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { subscription, userRoles } = useAccessControl();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => (await apiClient.get<UserProfile>('/users/me')).data,
  });

  const updateMutation = useMutation({
    mutationFn: (values: { first_name?: string; last_name?: string }) =>
      apiClient.patch('/users/profile/update', values),
    onSuccess: () => {
      message.success('Profile updated');
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update'),
  });

  const passwordMutation = useMutation({
    mutationFn: (values: { oldPassword: string; newPassword: string }) =>
      apiClient.post('/users/change-password', values),
    onSuccess: () => {
      message.success('Password changed successfully');
      passwordForm.resetFields();
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to change password'),
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!profile) return null;

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email;
  const initials = fullName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const planName = subscription?.plan?.name ?? 'No Plan';
  const planColors: Record<string, string> = { Starter: '#52c41a', Basic: '#1677ff', Pro: '#722ed1', Enterprise: '#fa8c16' };
  const planColor = planColors[planName] ?? '#1677ff';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Title level={4} style={{ color: '#f0f6ff', margin: 0 }}>My Profile</Title>

      {/* Avatar + summary */}
      <Card style={CARD} bodyStyle={{ padding: 28 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar size={80} style={{ background: 'linear-gradient(135deg, #1677ff, #722ed1)', fontSize: 28, fontWeight: 700, flexShrink: 0 }}>
            {initials}
          </Avatar>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ color: '#f0f6ff', margin: 0 }}>{fullName}</Title>
            <Text style={{ color: '#8a9bb0' }}>{profile.email}</Text>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {userRoles.map((r) => (
                <Tag key={r.id} icon={<SafetyOutlined />} color="blue">{r.name}</Tag>
              ))}
              <Tag icon={<CrownOutlined />} style={{ background: `${planColor}18`, border: `1px solid ${planColor}40`, color: planColor }}>
                {planName} Plan
              </Tag>
              <Tag color={profile.is_active ? 'green' : 'red'}>
                {profile.is_active ? 'Active' : 'Inactive'}
              </Tag>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text style={{ color: '#8a9bb0', fontSize: 12 }}>Member since</Text>
            <div style={{ color: '#c8dff0', fontSize: 13 }}>
              {new Date(profile.created_at).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </Card>

      <Row gutter={[20, 20]}>
        {/* Edit profile */}
        <Col xs={24} md={12}>
          <Card
            title={<Text style={{ color: '#f0f6ff', fontWeight: 600 }}>Personal Info</Text>}
            style={CARD} headStyle={HEAD}
            extra={
              !editMode
                ? <Button type="text" icon={<EditOutlined />} onClick={() => { setEditMode(true); profileForm.setFieldsValue({ first_name: profile.first_name, last_name: profile.last_name }); }} style={{ color: '#1677ff' }}>Edit</Button>
                : null
            }
          >
            {!editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'First Name', value: profile.first_name || '—' },
                  { label: 'Last Name', value: profile.last_name || '—' },
                  { label: 'Email', value: profile.email },
                ].map((f) => (
                  <div key={f.label}>
                    <Text style={{ color: '#8a9bb0', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</Text>
                    <div style={{ color: '#f0f6ff', fontSize: 14, marginTop: 2 }}>{f.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <Form form={profileForm} layout="vertical" onFinish={(v) => updateMutation.mutate(v)}>
                <Form.Item name="first_name" label={<Text style={{ color: '#8a9bb0' }}>First Name</Text>}>
                  <Input prefix={<UserOutlined />} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(134,166,197,0.15)', color: '#f0f6ff', borderRadius: 8 }} />
                </Form.Item>
                <Form.Item name="last_name" label={<Text style={{ color: '#8a9bb0' }}>Last Name</Text>}>
                  <Input prefix={<UserOutlined />} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(134,166,197,0.15)', color: '#f0f6ff', borderRadius: 8 }} />
                </Form.Item>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={updateMutation.isPending}>Save</Button>
                  <Button onClick={() => setEditMode(false)}>Cancel</Button>
                </div>
              </Form>
            )}
          </Card>
        </Col>

        {/* Change password */}
        <Col xs={24} md={12}>
          <Card
            title={<Text style={{ color: '#f0f6ff', fontWeight: 600 }}>Change Password</Text>}
            style={CARD} headStyle={HEAD}
          >
            <Form form={passwordForm} layout="vertical" onFinish={(v) => passwordMutation.mutate(v)}>
              <Form.Item name="oldPassword" label={<Text style={{ color: '#8a9bb0' }}>Current Password</Text>}
                rules={[{ required: true, message: 'Required' }]}>
                <Input.Password prefix={<LockOutlined />} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(134,166,197,0.15)', color: '#f0f6ff', borderRadius: 8 }} />
              </Form.Item>
              <Form.Item name="newPassword" label={<Text style={{ color: '#8a9bb0' }}>New Password</Text>}
                rules={[{ required: true, min: 6, message: 'Min 6 characters' }]}>
                <Input.Password prefix={<LockOutlined />} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(134,166,197,0.15)', color: '#f0f6ff', borderRadius: 8 }} />
              </Form.Item>
              <Form.Item name="confirmPassword" label={<Text style={{ color: '#8a9bb0' }}>Confirm Password</Text>}
                dependencies={['newPassword']}
                rules={[{ required: true }, ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                    return Promise.reject('Passwords do not match');
                  },
                })]}>
                <Input.Password prefix={<LockOutlined />} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(134,166,197,0.15)', color: '#f0f6ff', borderRadius: 8 }} />
              </Form.Item>
              <Button type="primary" htmlType="submit" icon={<LockOutlined />} loading={passwordMutation.isPending} block>
                Update Password
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>

      {/* Account info */}
      <Card title={<Text style={{ color: '#f0f6ff', fontWeight: 600 }}>Account Details</Text>} style={CARD} headStyle={HEAD}>
        <Row gutter={[24, 16]}>
          {[
            { label: 'User ID', value: profile.id, mono: true },
            { label: 'Email', value: profile.email, icon: <MailOutlined /> },
            { label: 'Account Type', value: profile.isSystemAdmin ? 'System Admin' : 'Tenant User' },
            { label: 'Subscription', value: `${planName} — ${subscription?.status ?? 'none'}` },
          ].map((item) => (
            <Col xs={24} sm={12} key={item.label}>
              <Text style={{ color: '#8a9bb0', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>{item.label}</Text>
              <Text style={{ color: '#c8dff0', fontSize: 13, fontFamily: item.mono ? 'monospace' : undefined, wordBreak: 'break-all' }}>
                {item.icon && <span style={{ marginRight: 6 }}>{item.icon}</span>}
                {item.value}
              </Text>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
