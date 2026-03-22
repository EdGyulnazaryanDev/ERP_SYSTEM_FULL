import { Button, Card, Form, Input, Segmented, message } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';

export default function ActivatePortalPage() {
  const navigate = useNavigate();

  const activateMutation = useMutation({
    mutationFn: authApi.activatePortalAccount,
    onSuccess: (_, values) => {
      message.success('Portal account activated. You can sign in now.');
      navigate(`/auth/login?actorType=${values.actorType}`);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to activate portal account');
    },
  });

  return (
    <Card className="shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-center mb-2">Activate Portal Access</h2>
        <p className="text-center text-gray-600">
          Customers and suppliers can activate access using an existing email in the system.
        </p>
      </div>

      <Form
        layout="vertical"
        size="large"
        initialValues={{ actorType: 'customer' }}
        onFinish={(values) => activateMutation.mutate(values)}
      >
        <Form.Item name="actorType" label="Portal Type">
          <Segmented
            block
            options={[
              { label: 'Customer', value: 'customer' },
              { label: 'Supplier', value: 'supplier' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="portal@email.com" />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: 'Please enter a password' },
            { min: 6, message: 'Password must be at least 6 characters' },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Confirm Password"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<UserOutlined />} placeholder="••••••••" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" className="w-full" loading={activateMutation.isPending}>
            Activate Portal Account
          </Button>
        </Form.Item>
      </Form>

      <div className="text-center mt-4">
        <span className="text-gray-600">Already activated? </span>
        <Link to="/auth/login" className="text-blue-500 hover:text-blue-700 font-medium">
          Sign in
        </Link>
      </div>
    </Card>
  );
}
