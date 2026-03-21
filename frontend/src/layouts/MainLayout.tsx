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

  const visibleMenuItems = menuItems.filter((item) =>
    item.pageKey ? canAccessPage(item.pageKey) : true,
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

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
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="flex items-center justify-center h-16 text-white text-xl font-bold">
          {collapsed ? 'ERP' : 'ERP System'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['/']}
          items={visibleMenuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }}>
          <div className="flex items-center justify-between px-4">
            <button
              className="text-lg"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="flex items-center gap-2 cursor-pointer">
                <span>{user?.name}</span>
                <Avatar icon={<UserOutlined />} />
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
