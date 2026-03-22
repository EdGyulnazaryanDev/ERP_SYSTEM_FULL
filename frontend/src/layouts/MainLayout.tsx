import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Spin, theme } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  FolderOutlined,
  TransactionOutlined,
  InboxOutlined,
  CarOutlined,
  DollarOutlined,
  TeamOutlined,
  CustomerServiceOutlined,
  ShoppingOutlined,
  HomeOutlined,
  ProjectOutlined,
  ToolOutlined,
  FileProtectOutlined,
  MessageOutlined,
  AuditOutlined,
  CreditCardOutlined,
  BarChartOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import { useAccessControl } from '@/hooks/useAccessControl';

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { canAccessPage, isLoading } = useAccessControl();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/',
      pageKey: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/products',
      pageKey: 'products',
      icon: <ShoppingCartOutlined />,
      label: 'Products & Services',
    },
    {
      key: '/categories',
      pageKey: 'categories',
      icon: <FolderOutlined />,
      label: 'Categories',
    },
    {
      key: '/inventory',
      pageKey: 'inventory',
      icon: <InboxOutlined />,
      label: 'Inventory',
    },
    {
      key: 'transactions-menu',
      pageKey: 'transactions',
      icon: <TransactionOutlined />,
      label: 'Transactions',
      children: [
        {
          key: '/transactions',
          label: 'All Transactions',
        },
        {
          key: '/transactions/analytics',
          label: 'Analytics',
        },
      ],
    },
    {
      key: '/accounting',
      pageKey: 'accounting',
      icon: <DollarOutlined />,
      label: 'Accounting',
    },
    {
      key: '/payments',
      pageKey: 'payments',
      icon: <CreditCardOutlined />,
      label: 'Payments',
    },
    {
      key: '/crm',
      pageKey: 'crm',
      icon: <CustomerServiceOutlined />,
      label: 'CRM',
    },
    {
      key: '/hr',
      pageKey: 'hr',
      icon: <TeamOutlined />,
      label: 'Human Resources',
    },
    {
      key: 'procurement-menu',
      pageKey: 'procurement',
      icon: <ShoppingOutlined />,
      label: 'Procurement',
      children: [
        {
          key: '/procurement',
          label: 'Overview',
        },
      ],
    },
    {
      key: '/warehouse',
      pageKey: 'warehouse',
      icon: <HomeOutlined />,
      label: 'Warehouse',
    },
    {
      key: 'transportation-menu',
      pageKey: 'transportation',
      icon: <CarOutlined />,
      label: 'Transportation',
      children: [
        {
          key: '/transportation',
          label: 'Overview',
        },
        {
          key: '/transportation/shipments',
          label: 'Shipments',
        },
        {
          key: '/transportation/couriers',
          label: 'Couriers',
        },
      ],
    },
    {
      key: '/projects',
      pageKey: 'projects',
      icon: <ProjectOutlined />,
      label: 'Projects',
    },
    {
      key: '/manufacturing',
      pageKey: 'manufacturing',
      icon: <ToolOutlined />,
      label: 'Manufacturing',
    },
    {
      key: '/equipment',
      pageKey: 'equipment',
      icon: <FileProtectOutlined />,
      label: 'Assets',
    },
    {
      key: '/services',
      pageKey: 'services',
      icon: <CustomerServiceOutlined />,
      label: 'Services',
    },
    {
      key: '/communication',
      pageKey: 'communication',
      icon: <MessageOutlined />,
      label: 'Communication',
    },
    {
      key: '/compliance',
      pageKey: 'compliance',
      icon: <AuditOutlined />,
      label: 'Compliance',
    },
    {
      key: '/bi',
      pageKey: 'bi',
      icon: <BarChartOutlined />,
      label: 'BI & Reports',
    },
    {
      key: '/users',
      pageKey: 'users',
      icon: <UserOutlined />,
      label: 'Users',
    },
    {
      key: '/suppliers',
      pageKey: 'suppliers',
      icon: <UserOutlined />,
      label: 'Suppliers',
    },
    {
      key: '/modules',
      pageKey: 'modules',
      icon: <AppstoreOutlined />,
      label: 'Modules',
    },
    {
      key: '/rbac',
      pageKey: 'rbac',
      icon: <SafetyOutlined />,
      label: 'RBAC',
    },
    {
      key: '/settings',
      pageKey: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  const visibleMenuItems = menuItems
    .filter((item) => (item.pageKey ? canAccessPage(item.pageKey) : true))
    .map(({ pageKey, ...item }) => item);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const userName = user?.name?.trim() || 'Operator';
  const userInitials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'OP';

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: () => {
        logout();
        navigate('/auth/login');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={276}
        collapsedWidth={92}
        style={{
          padding: '16px 12px 18px',
          background: 'transparent',
        }}
      >
        <div
          style={{
            height: 74,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '0 10px' : '0 14px',
            marginBottom: 12,
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.2) 0%, rgba(14, 165, 233, 0.12) 100%)',
            border: '1px solid rgba(88, 150, 198, 0.18)',
            boxShadow: '0 20px 45px rgba(2, 10, 19, 0.24)',
          }}
        >
          <div>
            <div style={{ color: '#f8fbff', fontSize: collapsed ? 20 : 13, fontWeight: 700, letterSpacing: '0.08em' }}>
              {collapsed ? 'BI' : 'BI OPS'}
            </div>
            {!collapsed && (
              <div style={{ color: '#8fd0de', fontSize: 12, marginTop: 4 }}>
                Enterprise intelligence
              </div>
            )}
          </div>
          {!collapsed && (
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(3, 12, 23, 0.4)',
                color: '#7dd3fc',
                fontWeight: 700,
              }}
            >
              IQ
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['/']}
          items={visibleMenuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            background: 'transparent',
            border: 0,
          }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            margin: '16px 16px 0',
            padding: '0 18px',
            height: 72,
            lineHeight: '72px',
            background: 'rgba(8, 25, 40, 0.74)',
            border: '1px solid rgba(134, 166, 197, 0.12)',
            borderRadius: 22,
            boxShadow: '0 24px 60px rgba(2, 10, 19, 0.22)',
          }}
        >
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <button
              className="text-lg"
              onClick={() => setCollapsed(!collapsed)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                border: '1px solid rgba(120, 153, 185, 0.16)',
                background: 'rgba(6, 19, 31, 0.76)',
                color: '#e6f6ff',
              }}
            >
                {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </button>
              <div>
                <div style={{ color: '#f8fbff', fontWeight: 700, fontSize: 16 }}>Executive Workspace</div>
                <div style={{ color: '#88a0b9', fontSize: 12, lineHeight: 1.2 }}>Monitor operations, finance, inventory, and growth in one surface</div>
              </div>
            </div>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div
                className="flex items-center gap-3 cursor-pointer"
                style={{
                  height: 46,
                  padding: '0 12px 0 10px',
                  borderRadius: 15,
                  border: '1px solid rgba(120, 153, 185, 0.12)',
                  background: 'linear-gradient(135deg, rgba(10, 31, 47, 0.54) 0%, rgba(5, 17, 29, 0.44) 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 10px 20px rgba(2, 10, 19, 0.12)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: 34,
                    height: 34,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.38), rgba(20, 184, 166, 0.08) 65%, transparent 100%)',
                    }}
                  />
                  <Avatar
                    size={30}
                    style={{
                      position: 'relative',
                      background: 'linear-gradient(135deg, #14b8a6 0%, #38bdf8 100%)',
                      color: '#04131f',
                      fontWeight: 800,
                      fontSize: 12,
                      border: '1px solid rgba(226, 248, 255, 0.14)',
                      boxShadow: '0 6px 14px rgba(20, 184, 166, 0.22)',
                    }}
                  >
                    {userInitials}
                  </Avatar>
                  <span
                    style={{
                      position: 'absolute',
                      right: 1,
                      bottom: 1,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#34d399',
                      border: '2px solid rgba(8, 25, 40, 0.9)',
                      boxShadow: '0 0 10px rgba(52, 211, 153, 0.45)',
                    }}
                  />
                </div>
                <div className="text-right">
                  <div style={{ color: '#f8fbff', fontWeight: 600, fontSize: 13 }}>{userName}</div>
                  <div style={{ color: '#8da3ba', fontSize: 11, lineHeight: 1.1 }}>Executive access</div>
                </div>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'rgba(148, 163, 184, 0.12)',
                    color: '#9fb8cf',
                    marginLeft: 2,
                  }}
                >
                  <DownOutlined style={{ fontSize: 10 }} />
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '18px 16px 16px',
            padding: 28,
            minHeight: 280,
            background: 'rgba(8, 25, 40, 0.62)',
            borderRadius: borderRadiusLG + 10,
            border: '1px solid rgba(134, 166, 197, 0.1)',
            boxShadow: '0 30px 70px rgba(2, 10, 19, 0.26)',
            backdropFilter: 'blur(18px)',
            overflow: 'hidden',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
