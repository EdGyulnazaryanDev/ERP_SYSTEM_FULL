import { useAuthStore } from '@/store/authStore';
import { Card, Descriptions, Button, message } from 'antd';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  iat: number;
  exp: number;
}

export default function AuthDebug() {
  const { user, token, isAuthenticated } = useAuthStore();

  const checkToken = () => {
    if (!token) {
      message.error('No token found');
      return;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const now = Date.now() / 1000;
      const isExpired = decoded.exp < now;

      console.log('Token Info:', {
        decoded,
        isExpired,
        expiresIn: decoded.exp - now,
      });

      if (isExpired) {
        message.error('Token is expired!');
      } else {
        message.success(`Token is valid. Expires in ${Math.floor((decoded.exp - now) / 60)} minutes`);
      }
    } catch (error) {
      message.error('Failed to decode token');
      console.error(error);
    }
  };

  return (
    <Card title="Authentication Debug" className="mb-4">
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="Authenticated">
          {isAuthenticated ? '✅ Yes' : '❌ No'}
        </Descriptions.Item>
        <Descriptions.Item label="User ID">
          {user?.id || 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          {user?.email || 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label="Tenant ID">
          {user?.tenantId || 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label="Token">
          {token ? `${token.substring(0, 20)}...` : 'N/A'}
        </Descriptions.Item>
      </Descriptions>
      <Button onClick={checkToken} type="primary" className="mt-4">
        Check Token Validity
      </Button>
    </Card>
  );
}
