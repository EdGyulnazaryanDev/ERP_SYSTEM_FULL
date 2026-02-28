import { Form, Input, Button, Card, message, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { jwtDecode } from 'jwt-decode';
interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      try {
        // Decode JWT to get user info
        const decoded = jwtDecode<JwtPayload>(response.data.accessToken);

        const user = {
          id: decoded.sub,
          email: decoded.email,
          name: decoded.email.split('@')[0], // Temporary name from email
          tenantId: decoded.tenantId,
          role: 'user', // Default role, should be fetched from backend
        };

        setAuth(user, response.data.accessToken);
        message.success('Login successful!');
        navigate('/');
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
          name: decoded.email.split('@')[0], // Temporary name from email
          tenantId: decoded.tenantId,
          role: 'user', // Default role, should be fetched from backend
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

  const onFinish = (values: { email: string; password: string }) => {
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
      >
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

      <Button
        type="default"
        className="w-full mb-4"
        loading={quickLoginMutation.isPending}
        onClick={handleQuickLogin}
      >
        Quick Test Login
      </Button>

      <Divider plain>or</Divider>

      <div className="text-center">
        <span className="text-gray-600">Don't have an account? </span>
        <Link to="/auth/register" className="text-blue-500 hover:text-blue-700 font-medium">
          Create one now
        </Link>
      </div>
    </Card>
  );
}
