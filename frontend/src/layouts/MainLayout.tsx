import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, theme } from 'antd';
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
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/products',
      icon: <ShoppingCartOutlined />,
      label: 'Products & Services',
    },
    {
      key: '/categories',
      icon: <FolderOutlined />,
      label: 'Categories',
    },
    {
      key: '/inventory',
      icon: <InboxOutlined />,
      label: 'Inventory',
    },
    {
      key: 'transactions-menu',
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
      icon: <DollarOutlined />,
      label: 'Accounting',
    },
    {
      key: '/payments',
      icon: <CreditCardOutlined />,
      label: 'Payments',
    },
    {
      key: '/crm',
      icon: <CustomerServiceOutlined />,
      label: 'CRM',
    },
    {
      key: '/hr',
      icon: <TeamOutlined />,
      label: 'Human Resources',
    },
    {
      key: 'procurement-menu',
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
      icon: <HomeOutlined />,
      label: 'Warehouse',
    },
    {
      key: 'transportation-menu',
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
      icon: <ProjectOutlined />,
      label: 'Projects',
    },
    {
      key: '/manufacturing',
      icon: <ToolOutlined />,
      label: 'Manufacturing',
    },
    {
      key: '/assets',
      icon: <FileProtectOutlined />,
      label: 'Assets',
    },
    {
      key: '/services',
      icon: <CustomerServiceOutlined />,
      label: 'Services',
    },
    {
      key: '/communication',
      icon: <MessageOutlined />,
      label: 'Communication',
    },
    {
      key: '/compliance',
      icon: <AuditOutlined />,
      label: 'Compliance',
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: 'Users',
    },
    {
      key: '/suppliers',
      icon: <UserOutlined />,
      label: 'Suppliers',
    },
    {
      key: '/modules',
      icon: <AppstoreOutlined />,
      label: 'Modules',
    },
    {
      key: '/rbac',
      icon: <SafetyOutlined />,
      label: 'RBAC',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

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
          items={menuItems}
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
