import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Grid, theme } from 'antd';
import {
  TeamOutlined,
  CrownOutlined,
  SwapOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DownOutlined,
  DashboardOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/admin/tenants', icon: <TeamOutlined />, label: 'Tenants' },
  { key: '/admin/plans', icon: <CrownOutlined />, label: 'Subscription Plans' },
  { key: '/admin/plan-assignment', icon: <SwapOutlined />, label: 'Plan Assignment' },
  { key: '/admin/system-health', icon: <DashboardOutlined />, label: 'System Health' },
  { key: '/admin/settings', icon: <SettingOutlined />, label: 'Global Settings' },
  { key: '/admin/services', icon: <CustomerServiceOutlined />, label: 'Dev Roadmap' },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const { token: { borderRadiusLG } } = theme.useToken();

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout' },
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'profile') navigate('/admin/profile');
    if (key === 'logout') { logout(); navigate('/auth/login'); }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={260}
        collapsedWidth={80}
        style={{ padding: '16px 12px 18px', background: 'transparent' }}
      >
        <div style={{
          height: 74, display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0 10px' : '0 14px', marginBottom: 12,
          borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.2) 0%, rgba(239, 68, 68, 0.12) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
        }}>
          <div>
            <div style={{ color: '#f8fbff', fontSize: collapsed ? 18 : 13, fontWeight: 700, letterSpacing: '0.08em' }}>
              {collapsed ? 'SA' : 'PLATFORM ADMIN'}
            </div>
            {!collapsed && <div style={{ color: '#fca5a5', fontSize: 11, marginTop: 4 }}>System Administration</div>}
          </div>
          {!collapsed && (
            <div style={{ width: 36, height: 36, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontWeight: 700 }}>
              <CrownOutlined />
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['/admin/tenants']}
          selectedKeys={[window.location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', border: 0 }}
        />
      </Sider>

      <Layout>
        <Header style={{
          margin: isMobile ? '12px 12px 0' : '16px 16px 0',
          padding: '0 18px', height: 72, lineHeight: '72px',
          background: 'rgba(8, 25, 40, 0.74)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          borderRadius: 22,
          boxShadow: '0 24px 60px rgba(2, 10, 19, 0.22)',
        }}>
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  width: 44, height: 44, borderRadius: 14,
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  background: 'rgba(6, 19, 31, 0.76)', color: '#e6f6ff',
                }}
              >
                {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </button>
              <div>
                <div style={{ color: '#f8fbff', fontWeight: 700, fontSize: 16 }}>Platform Administration</div>
                <div style={{ color: '#88a0b9', fontSize: 12 }}>Manage tenants, plans, and global settings</div>
              </div>
            </div>

            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
              <div className="flex items-center gap-3 cursor-pointer" style={{
                padding: '6px 12px 6px 10px', borderRadius: 15,
                border: '1px solid rgba(239, 68, 68, 0.15)',
                background: 'linear-gradient(135deg, rgba(10, 31, 47, 0.54) 0%, rgba(5, 17, 29, 0.44) 100%)',
              }}>
                <Avatar size={30} icon={<UserOutlined />} style={{ background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)', color: '#fff' }} />
                <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
                  <div style={{ color: '#f8fbff', fontWeight: 600, fontSize: 13 }}>{user?.email}</div>
                  <div style={{
                    display: 'inline-block', padding: '1px 8px', borderRadius: 20,
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171',
                  }}>
                    Platform Admin
                  </div>
                </div>
                <DownOutlined style={{ fontSize: 10, color: '#9fb8cf' }} />
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{
          margin: '18px 16px 16px', padding: 28, minHeight: 280,
          background: 'rgba(8, 25, 40, 0.62)',
          borderRadius: borderRadiusLG + 10,
          border: '1px solid rgba(134, 166, 197, 0.1)',
          boxShadow: '0 30px 70px rgba(2, 10, 19, 0.26)',
          backdropFilter: 'blur(18px)', overflow: 'hidden',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
