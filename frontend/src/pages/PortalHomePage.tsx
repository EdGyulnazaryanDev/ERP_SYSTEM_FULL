import { Button, Card, Col, Row, Space, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const { Paragraph, Text, Title } = Typography;

export default function PortalHomePage() {
  const { user, logout } = useAuthStore();

  return (
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <Card
          style={{
            borderRadius: 20,
            background: 'rgba(8, 25, 40, 0.74)',
            border: '1px solid rgba(134, 166, 197, 0.12)',
            boxShadow: '0 24px 60px rgba(2, 10, 19, 0.22)',
          }}
        >
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <div>
              <Tag color={user?.actorType === 'supplier' ? 'cyan' : 'green'}>
                {user?.actorType?.toUpperCase()} PORTAL
              </Tag>
              <Title level={2} style={{ margin: '12px 0 4px', color: 'var(--app-text)' }}>
                Welcome, {user?.name || 'Portal user'}
              </Title>
              <Paragraph style={{ margin: 0, color: 'var(--app-text-muted)' }}>
                Your external access is active. This portal can be expanded for customer self-service,
                supplier collaboration, invoices, orders, shipment tracking, and document exchange.
              </Paragraph>
            </div>

            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Card size="small">
                  <Text type="secondary">Email</Text>
                  <div>{user?.email}</div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small">
                  <Text type="secondary">Tenant</Text>
                  <div>{user?.tenantId}</div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card size="small">
                  <Text type="secondary">Access Type</Text>
                  <div>{user?.actorType}</div>
                </Card>
              </Col>
            </Row>

            <Space wrap>
              <Button danger onClick={logout}>
                Sign out
              </Button>
              <Button type="default">
                <Link to="/auth/login">Switch account</Link>
              </Button>
            </Space>
          </Space>
        </Card>
      </div>
    </div>
  );
}
