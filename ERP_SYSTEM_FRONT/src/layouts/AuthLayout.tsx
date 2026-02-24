import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';

const { Content } = Layout;

export default function AuthLayout() {
  return (
    <Layout className="min-h-screen">
      <Content className="flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800">ERP System</h1>
            <p className="text-gray-600 mt-2">Dynamic Enterprise Resource Planning</p>
          </div>
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
}
