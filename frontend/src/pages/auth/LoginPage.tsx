import { Form, Input, Button, Card, message, Divider, Segmented } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { jwtDecode } from 'jwt-decode';
interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  actorType: 'staff' | 'customer' | 'supplier';
  principalId: string;
  role?: string;
  name?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();
  const initialActorType = (searchParams.get('actorType') as JwtPayload['actorType']) || 'staff';

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      try {
        // Decode JWT to get user info
        const decoded = jwtDecode<JwtPayload>(response.data.accessToken);

        const user = {
          id: decoded.sub,
          email: decoded.email,
          name: decoded.name || decoded.email.split('@')[0],
          tenantId: decoded.tenantId,
          role: decoded.role || (decoded.actorType === 'staff' ? 'user' : decoded.actorType),
          actorType: decoded.actorType,
          principalId: decoded.principalId,
        };

        setAuth(user, response.data.accessToken);
        message.success('Login successful!');
        navigate(decoded.actorType === 'staff' ? '/' : '/portal');
      } catch (error) {
        message.error('Failed to process login response');
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Invalid credentials');
    },
  });

  const quickLoginMutation = useMutation({
    mutationFn: authApi.quickLogin,
    onSuccess: (response) => {
      try {
        // Decode JWT to get user info
        const decoded = jwtDecode<JwtPayload>(response.data.accessToken);

        const user = {
          id: decoded.sub,
          email: decoded.email,
          name: decoded.name || decoded.email.split('@')[0],
          tenantId: decoded.tenantId,
          role: decoded.role || 'user',
          actorType: decoded.actorType,
          principalId: decoded.principalId,
        };

        setAuth(user, response.data.accessToken);
        message.success('Quick login successful!');
        navigate('/');
      } catch (error) {
        message.error('Failed to process login response');
      }
    },
    onError: () => {
      message.error('Quick login failed. Please ensure the backend is running.');
    },
  });

  const onFinish = (values: { email: string; password: string; actorType: JwtPayload['actorType'] }) => {
    loginMutation.mutate(values);
  };

  const handleQuickLogin = () => {
    quickLoginMutation.mutate();
  };

  return (
    <Card className="shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-center mb-2">Welcome Back</h2>
        <p className="text-center text-gray-600">Sign in to your ERP account</p>
      </div>

      <Form
        name="login"
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
        size="large"
        initialValues={{ actorType: initialActorType }}
      >
        <Form.Item name="actorType" label="Sign In As">
          <Segmented
            block
            options={[
              { label: 'Staff', value: 'staff' },
              { label: 'Customer', value: 'customer' },
              { label: 'Supplier', value: 'supplier' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Please input your email!' },
            { type: 'email', message: 'Please enter a valid email!' },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="your@email.com"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: 'Please input your password!' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="••••••••"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            className="w-full"
            loading={loginMutation.isPending}
          >
            Sign In
          </Button>
        </Form.Item>
      </Form>

      <Divider plain>or</Divider>

      {initialActorType === 'staff' && (
        <>
          <Button
            type="default"
            className="w-full mb-4"
            loading={quickLoginMutation.isPending}
            onClick={handleQuickLogin}
          >
            Quick Test Login
          </Button>

          <Divider plain>or</Divider>
        </>
      )}

      <div className="text-center">
        <div>
          <span className="text-gray-600">Need a staff account? </span>
          <Link to="/auth/register" className="text-blue-500 hover:text-blue-700 font-medium">
            Create one now
          </Link>
        </div>
        <div className="mt-2">
          <span className="text-gray-600">Customer or supplier? </span>
          <Link to="/auth/activate" className="text-blue-500 hover:text-blue-700 font-medium">
            Activate portal access
          </Link>
        </div>
      </div>
    </Card>
  );
}
