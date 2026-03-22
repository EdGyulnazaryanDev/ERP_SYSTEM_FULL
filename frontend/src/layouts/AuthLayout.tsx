import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';

const { Content } = Layout;

export default function AuthLayout() {
  return (
    <Layout className="min-h-screen">
      <Content
        className="flex items-center justify-center"
        style={{
          padding: '32px 20px',
          background:
            'radial-gradient(circle at top left, rgba(34, 211, 238, 0.12), transparent 22%), radial-gradient(circle at top right, rgba(20, 184, 166, 0.14), transparent 20%), linear-gradient(180deg, #102338 0%, #081521 38%, #07111c 100%)',
        }}
      >
        <div className="w-full max-w-md">
          <div
            className="text-center mb-8"
            style={{
              padding: '24px 20px',
              borderRadius: 24,
              background: 'rgba(8, 25, 40, 0.72)',
              border: '1px solid rgba(134, 166, 197, 0.12)',
              boxShadow: '0 24px 60px rgba(2, 10, 19, 0.26)',
              backdropFilter: 'blur(18px)',
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 700 }}>
              BI Workspace
            </div>
            <h1 className="text-4xl font-bold mt-3" style={{ color: '#f8fbff' }}>ERP System</h1>
            <p className="mt-3" style={{ color: '#8da3ba' }}>Operational intelligence for finance, inventory, projects, and growth.</p>
          </div>
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
}
