import { Card, Row, Col, Statistic } from 'antd';
import {
  AppstoreOutlined,
  DatabaseOutlined,
  UserOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import AuthDebug from '@/components/AuthDebug';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <AuthDebug />
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Modules"
              value={12}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Records"
              value={1543}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={48}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Growth"
              value={23.5}
              prefix={<RiseOutlined />}
              suffix="%"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} lg={16}>
          <Card title="Recent Activity" className="h-full">
            <p className="text-gray-500">No recent activity</p>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Quick Actions" className="h-full">
            <div className="space-y-2">
              <a href="/modules/builder" className="block text-blue-500 hover:text-blue-700">
                Create New Module
              </a>
              <a href="/modules" className="block text-blue-500 hover:text-blue-700">
                View Modules
              </a>
              <a href="/" className="block text-blue-500 hover:text-blue-700">
                Manage Users
              </a>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
