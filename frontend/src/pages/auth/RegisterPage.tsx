import { Form, Input, Button, Card, message, Steps } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, BankOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import { jwtDecode } from 'jwt-decode';
import type { RegisterRequest } from '@/api/auth';

interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  actorType: 'staff' | 'customer' | 'supplier';
  principalId: string;
  role?: string;
  name?: string;
  isSystemAdmin?: boolean;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<RegisterRequest>>({});

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: async (response) => {
      try {
        // Decode JWT to get user info
        const decoded = jwtDecode<JwtPayload>(response.data.accessToken);
        
        const user = {
          id: decoded.sub,
          email: decoded.email,
          name: decoded.name || `${formData.firstName} ${formData.lastName}`,
          tenantId: decoded.tenantId,
          role: decoded.role || 'admin',
          actorType: decoded.actorType,
          principalId: decoded.principalId,
          isSystemAdmin: decoded.isSystemAdmin ?? false,
        };
        
        setAuth(user, response.data.accessToken);
        message.success('Registration successful! Welcome to your ERP system.');
        navigate('/');
      } catch (error) {
        message.error('Failed to process registration response');
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Registration failed');
    },
  });

  const onStepOneFinish = (values: { companyName: string }) => {
    setFormData({ ...formData, ...values });
    setCurrentStep(1);
  };

  const onStepTwoFinish = (values: Omit<RegisterRequest, 'companyName'>) => {
    const completeData = { ...formData, ...values } as RegisterRequest;
    registerMutation.mutate(completeData);
  };

  return (
    <Card className="shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-center mb-2">Create Your ERP Account</h2>
        <p className="text-center text-gray-600">
          Start your journey with a powerful ERP system
        </p>
      </div>

      <Steps
        current={currentStep}
        items={[
          { title: 'Company' },
          { title: 'Account' },
        ]}
        className="mb-8"
      />

      {currentStep === 0 && (
        <Form
          name="company"
          onFinish={onStepOneFinish}
          autoComplete="off"
          layout="vertical"
          size="large"
          initialValues={{ companyName: formData.companyName }}
        >
          <Form.Item
            name="companyName"
            label="Company Name"
            rules={[
              { required: true, message: 'Please enter your company name!' },
              { min: 2, message: 'Company name must be at least 2 characters' },
            ]}
          >
            <Input
              prefix={<BankOutlined />}
              placeholder="Acme Corporation"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="w-full">
              Continue
            </Button>
          </Form.Item>

          <div className="text-center mt-4">
            <span className="text-gray-600">Already have an account? </span>
            <Link to="/auth/login" className="text-blue-500 hover:text-blue-700">
              Sign in
            </Link>
          </div>
        </Form>
      )}

      {currentStep === 1 && (
        <Form
          name="account"
          onFinish={onStepTwoFinish}
          autoComplete="off"
          layout="vertical"
          size="large"
          initialValues={{
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[
                { required: true, message: 'Please enter your first name!' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="John"
              />
            </Form.Item>

            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[
                { required: true, message: 'Please enter your last name!' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Doe"
              />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Please enter your email!' },
              { type: 'email', message: 'Please enter a valid email!' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="john@acme.com"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter your password!' },
              { min: 6, message: 'Password must be at least 6 characters!' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="••••••••"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match!'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="••••••••"
            />
          </Form.Item>

          <Form.Item>
            <div className="flex gap-2">
              <Button onClick={() => setCurrentStep(0)} className="flex-1">
                Back
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                className="flex-1"
                loading={registerMutation.isPending}
              >
                Create Account
              </Button>
            </div>
          </Form.Item>

          <div className="text-center mt-4">
            <span className="text-gray-600">Already have an account? </span>
            <Link to="/auth/login" className="text-blue-500 hover:text-blue-700">
              Sign in
            </Link>
          </div>
        </Form>
      )}
    </Card>
  );
}
