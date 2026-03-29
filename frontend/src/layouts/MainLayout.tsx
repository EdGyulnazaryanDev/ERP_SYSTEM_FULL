import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Spin, Drawer, Grid, theme, Button, Row, Col, Tag, Switch, Modal, notification, Divider, Typography } from 'antd';
import MiniChat from '@/components/MiniChat';
import AppFooter from '@/components/AppFooter';
import {
  DashboardOutlined,
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
  CrownOutlined,
  StopOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useAccessControl } from '@/hooks/useAccessControl';
import { subscriptionsApi, type SubscriptionPlan } from '@/api/subscriptions';
import { usePendingCounts } from '@/hooks/usePendingCounts';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const PLAN_COLORS = ['#52c41a', '#1677ff', '#722ed1', '#fa8c16'];
const FEATURE_LABELS: Record<string, string> = {
  warehouse: 'Warehouse', accounting: 'Accounting', reports: 'BI & Reports',
};
const LIMIT_LABELS: Record<string, string> = {
  users: 'Users', products: 'Products', categories: 'Categories',
  transactions_per_month: 'Transactions/mo', storage_gb: 'Storage (GB)',
};

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isSuspended, setIsSuspended] = useState(
    () => sessionStorage.getItem('tenant_suspended') === '1',
  );
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { canAccessPage, isLockedBySubscription, isPrivilegedUser, isLoading, userRoles, subscription } = useAccessControl();
  const { procurementPending, shipmentsPending } = usePendingCounts();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const {
    token: { borderRadiusLG },
  } = theme.useToken();

  // Plan selection hooks - MUST be declared before any conditional returns
  const queryClient = useQueryClient();
  const [yearly, setYearly] = useState(false);

  // Force plan selection when tenant has no active subscription (only after loading completes)
  // ALL tenant users (including Admin role) must select a plan — only system admins bypass this
  const needsPlanSelection =
    !isLoading &&
    !user?.isSystemAdmin &&
    (subscription === null || subscription === undefined);

  console.log('🔍 Plan Selection Debug:', {
    isLoading,
    isSystemAdmin: user?.isSystemAdmin,
    subscription,
    subscriptionIsNull: subscription === null,
    subscriptionIsUndefined: subscription === undefined,
    subscriptionType: typeof subscription,
    needsPlanSelection,
    userEmail: user?.email,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['available-plans'],
    queryFn: async () => (await subscriptionsApi.getPlans()).data,
    enabled: needsPlanSelection,
  });

  const selectMutation = useMutation({
    mutationFn: (planCode: string) =>
      subscriptionsApi.selectPlan({ planCode, billingCycle: yearly ? 'yearly' : 'monthly', autoRenew: true }),
    onSuccess: () => {
      notification.success({ message: 'Plan selected! Welcome aboard.' });
      // Invalidate all access-related caches so sidebar reflects the new plan immediately
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['page-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['my-page-access'] });
    },
    onError: () => notification.error({ message: 'Failed to select plan' }),
  });

  useEffect(() => {
    const handler = () => setIsSuspended(true);
    window.addEventListener('tenant-suspended', handler);
    return () => window.removeEventListener('tenant-suspended', handler);
  }, []);

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
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          Procurement
          {procurementPending > 0 && (
            <span style={{
              background: '#ff4d4f', color: '#fff', borderRadius: 10,
              fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center',
            }}>
              {procurementPending > 99 ? '99+' : procurementPending}
            </span>
          )}
        </span>
      ),
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
          label: (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              Shipments
              {shipmentsPending > 0 && (
                <span style={{
                  background: '#fa8c16', color: '#fff', borderRadius: 10,
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center',
                }}>
                  {shipmentsPending > 99 ? '99+' : shipmentsPending}
                </span>
              )}
            </span>
          ),
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
    /*{
      key: '/modules',
      pageKey: 'modules',
      icon: <AppstoreOutlined />,
      label: 'Modules',
    },*/
    {
      key: '/rbac',
      pageKey: 'rbac',
      icon: <SafetyOutlined />,
      label: 'Access Governance',
    },
    {
      key: '/settings',
      pageKey: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    ...(isPrivilegedUser && !user?.isSystemAdmin
      ? [
          {
            key: '/settings/subscription',
            pageKey: undefined as unknown as string,
            icon: <CrownOutlined />,
            label: 'Manage Plan',
          },
        ]
      : []),
  ];

  const visibleMenuItems = menuItems
    .filter((item) => {
      if (!item.pageKey) return true;
      // Subscription gating applies to everyone — only system admin bypasses
      return canAccessPage(item.pageKey) && !isLockedBySubscription(item.pageKey);
    })
    .map(({ pageKey: _pageKey, ...item }) => item);

  // Inject admin plan builder for system admins — now handled by AdminLayout
  // (system admins are redirected to /admin before reaching MainLayout)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  // Tenant account suspended by platform admin
  if (isSuspended) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          background: 'radial-gradient(ellipse at 30% 40%, rgba(239,68,68,0.07) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(14,165,233,0.05) 0%, transparent 55%)',
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
            padding: '48px 40px',
            borderRadius: 24,
            background: 'rgba(8, 25, 40, 0.82)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            boxShadow: '0 40px 80px rgba(2, 10, 19, 0.4)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 24px',
            }}
          >
            <StopOutlined style={{ fontSize: 32, color: '#ef4444' }} />
          </div>
          <div style={{ color: '#f0f6ff', fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
            Account Suspended
          </div>
          <div style={{ color: '#8a9bb0', fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
            Your organization's access has been suspended by the platform administrator.
            All data is preserved. Please contact support to restore access.
          </div>
          <div
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              color: '#fca5a5',
              fontSize: 13,
              marginBottom: 32,
              textAlign: 'left',
            }}
          >
            <span style={{ fontWeight: 600 }}>Account:</span> {user?.email ?? '—'}
          </div>
          <Button
            size="large"
            onClick={() => {
              sessionStorage.removeItem('tenant_suspended');
              logout();
              navigate('/auth/login');
            }}
            style={{
              width: '100%',
              height: 46,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0',
              fontWeight: 600,
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (needsPlanSelection) {
    const popularIdx = plans.length >= 3 ? Math.floor(plans.length / 2) : 0;
    return (
      <div style={{ minHeight: '100vh', overflowY: 'auto', background: 'linear-gradient(135deg, #020c16 0%, #041525 40%, #061d30 100%)', position: 'relative' }}>
        {/* Ambient blobs */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.06) 0%, transparent 70%)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, padding: '52px 20px 60px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 18px', borderRadius: 999, background: 'rgba(250,173,20,0.1)', border: '1px solid rgba(250,173,20,0.25)', marginBottom: 20 }}>
              <CrownOutlined style={{ color: '#faad14', fontSize: 14 }} />
              <Text style={{ color: '#faad14', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Subscription Required</Text>
            </div>
            <div style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, background: 'linear-gradient(135deg, #f0f6ff 0%, #7dd3fc 50%, #5eead4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.15, marginBottom: 14 }}>
              Choose Your Plan
            </div>
            <Text style={{ color: '#8a9bb0', fontSize: 15, display: 'block', marginBottom: 28 }}>
              Select a plan to unlock the platform and start using your ERP.
            </Text>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '8px 20px', borderRadius: 999, background: 'rgba(8,25,40,0.6)', border: '1px solid rgba(134,166,197,0.12)' }}>
              <Text style={{ color: yearly ? '#3a5060' : '#f0f6ff', fontSize: 14, fontWeight: 500 }}>Monthly</Text>
              <Switch checked={yearly} onChange={setYearly} style={{ background: yearly ? '#0ea5e9' : undefined }} />
              <Text style={{ color: yearly ? '#f0f6ff' : '#3a5060', fontSize: 14, fontWeight: 500 }}>Yearly</Text>
              <Tag style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '1px 10px', margin: 0 }}>Save 17%</Tag>
            </div>
          </div>

          {plansLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>
          ) : (
            <div style={{ maxWidth: 1280, margin: '0 auto' }}>
              <Row gutter={[16, 24]} justify="center" align="stretch">
                {plans.map((plan: SubscriptionPlan, idx: number) => {
                  const price = yearly ? plan.pricing.yearly : plan.pricing.monthly;
                  const accentColor = PLAN_COLORS[idx % PLAN_COLORS.length];
                  const isPopular = idx === popularIdx;
                  const isLast = idx === plans.length - 1 && plans.length > 2;
                  const colProps = isLast
                    ? { xs: 24, sm: 24, md: 24, lg: 8, xl: 7 }
                    : isPopular
                    ? { xs: 24, sm: 24, md: 12, lg: 7, xl: 6 }
                    : { xs: 24, sm: 12, md: 12, lg: 5, xl: 5 };
                  return (
                    <Col key={plan.id} {...colProps}>
                      <div style={{
                        height: '100%', position: 'relative',
                        borderRadius: isPopular ? 24 : 18,
                        padding: isPopular ? '2px' : '1px',
                        background: isPopular ? `linear-gradient(135deg, ${accentColor}80, ${accentColor}30, transparent)` : 'rgba(134,166,197,0.1)',
                        transform: isPopular ? 'scale(1.03)' : 'scale(1)',
                        boxShadow: isPopular ? `0 0 60px ${accentColor}20, 0 30px 60px rgba(2,10,19,0.4)` : '0 20px 40px rgba(2,10,19,0.3)',
                      }}>
                        {isPopular && (
                          <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', padding: '4px 20px', borderRadius: 999, zIndex: 2, background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' as const, boxShadow: `0 4px 20px ${accentColor}50`, whiteSpace: 'nowrap' as const }}>
                            Most Popular
                          </div>
                        )}
                        <div style={{ height: '100%', borderRadius: isPopular ? 22 : 17, background: isPopular ? 'linear-gradient(160deg, rgba(12,32,52,0.95) 0%, rgba(8,22,38,0.98) 100%)' : 'rgba(8,22,38,0.85)', padding: isLast ? '32px 28px' : isPopular ? '36px 28px' : '28px 22px', display: 'flex', flexDirection: 'column' as const, backdropFilter: 'blur(20px)' }}>
                          {/* Icon + name */}
                          <div style={{ marginBottom: isPopular ? 20 : 16 }}>
                            <div style={{ width: isPopular ? 48 : 40, height: isPopular ? 48 : 40, borderRadius: isPopular ? 16 : 12, background: `linear-gradient(135deg, ${accentColor}25, ${accentColor}10)`, border: `1px solid ${accentColor}30`, display: 'grid', placeItems: 'center', marginBottom: 14 }}>
                              <CrownOutlined style={{ color: accentColor, fontSize: isPopular ? 22 : 18 }} />
                            </div>
                            <div style={{ fontSize: isPopular ? 20 : 17, fontWeight: 700, color: '#f0f6ff', marginBottom: 6 }}>{plan.name}</div>
                            {plan.description && <Text style={{ color: '#6a8090', fontSize: 13, lineHeight: 1.5 }}>{plan.description}</Text>}
                          </div>
                          {/* Price */}
                          <div style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                              <span style={{ fontSize: isPopular ? 44 : 36, fontWeight: 800, color: accentColor, lineHeight: 1 }}>${price}</span>
                              <span style={{ color: '#4a6070', fontSize: 14 }}>/{yearly ? 'yr' : 'mo'}</span>
                            </div>
                            {yearly && <Text style={{ color: '#34d399', fontSize: 12, marginTop: 4, display: 'block' }}>~${Math.round(price / 12)}/mo billed annually</Text>}
                          </div>
                          <Divider style={{ margin: '0 0 16px', borderColor: 'rgba(134,166,197,0.08)' }} />
                          {/* Features */}
                          {plan.features.length > 0 && (
                            <div style={{ marginBottom: 16, flex: 1 }}>
                              {plan.features.map((f) => (
                                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                  <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, background: `${accentColor}18`, display: 'grid', placeItems: 'center' }}>
                                    <CheckCircleFilled style={{ color: accentColor, fontSize: 11 }} />
                                  </div>
                                  <Text style={{ fontSize: 13, color: '#c8dff0' }}>{FEATURE_LABELS[f] ?? f}</Text>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Limits */}
                          {Object.keys(plan.limits).length > 0 && (
                            <div style={{ marginBottom: 20, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(134,166,197,0.07)' }}>
                              {Object.entries(plan.limits).map(([key, value]) => (
                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                  <Text style={{ fontSize: 12, color: '#4a6070' }}>{LIMIT_LABELS[key] ?? key}</Text>
                                  <Text style={{ fontSize: 12, fontWeight: 600, color: value === null ? '#34d399' : '#c8dff0' }}>{value === null ? '\u221e Unlimited' : (value as number).toLocaleString()}</Text>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* CTA */}
                          <Button
                            type="primary" block size="large"
                            loading={selectMutation.isPending}
                            onClick={() => Modal.confirm({
                              title: `Confirm ${plan.name} Plan`,
                              content: `You'll be on the ${plan.name} plan at $${price}/${yearly ? 'yr' : 'mo'}.`,
                              okText: 'Confirm & Continue',
                              onOk: () => selectMutation.mutate(plan.code),
                            })}
                            style={{ height: 46, borderRadius: 12, fontWeight: 700, fontSize: 14, border: 'none', background: isPopular ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : `${accentColor}20`, color: isPopular ? '#fff' : accentColor, boxShadow: isPopular ? `0 8px 24px ${accentColor}40` : 'none' }}
                          >
                            {isPopular ? `Get ${plan.name}` : `Select ${plan.name}`}
                          </Button>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Button type="text" onClick={() => { logout(); navigate('/auth/login'); }} style={{ color: '#3a5060', fontSize: 13 }}>
              Sign out of {user?.email}
            </Button>
          </div>
        </div>
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
    },
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'profile') navigate('/profile');
    if (key === 'logout') { logout(); navigate('/auth/login'); }
  };

  const handleMenuNavigate = (key: string) => {
    navigate(key);
    setMobileNavOpen(false);
  };

  const menuNode = (
    <Menu
      theme="dark"
      mode="inline"
      defaultSelectedKeys={['/']}
      items={visibleMenuItems}
      onClick={({ key }) => handleMenuNavigate(key)}
      style={{
        background: 'transparent',
        border: 0,
      }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      {!isMobile && (
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
        {menuNode}
      </Sider>
      )}
      {isMobile && (
        <Drawer
          placement="left"
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          closable={false}
          width={296}
          styles={{
            body: {
              padding: '16px 12px 18px',
              background:
                'linear-gradient(180deg, rgba(7, 26, 43, 0.98) 0%, rgba(6, 19, 31, 0.99) 100%)',
            },
            content: {
              background:
                'linear-gradient(180deg, rgba(7, 26, 43, 0.98) 0%, rgba(6, 19, 31, 0.99) 100%)',
            },
            mask: {
              backdropFilter: 'blur(6px)',
              background: 'rgba(3, 10, 18, 0.58)',
            },
            header: {
              display: 'none',
            },
          }}
        >
          <div
            style={{
              height: 74,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 14px',
              marginBottom: 12,
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.2) 0%, rgba(14, 165, 233, 0.12) 100%)',
              border: '1px solid rgba(88, 150, 198, 0.18)',
              boxShadow: '0 20px 45px rgba(2, 10, 19, 0.24)',
            }}
          >
            <div>
              <div style={{ color: '#f8fbff', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em' }}>
                BI OPS
              </div>
              <div style={{ color: '#8fd0de', fontSize: 12, marginTop: 4 }}>
                Enterprise intelligence
              </div>
            </div>
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
          </div>
          {menuNode}
        </Drawer>
      )}
      <Layout>
        <Header
          className="app-shell-header"
          style={{
            margin: isMobile ? '12px 12px 0' : '16px 16px 0',
            padding: isMobile ? '0 12px' : '0 18px',
            height: isMobile ? 64 : 72,
            lineHeight: isMobile ? '64px' : '72px',
            background: 'rgba(8, 25, 40, 0.74)',
            border: '1px solid rgba(134, 166, 197, 0.12)',
            borderRadius: isMobile ? 18 : 22,
            boxShadow: '0 24px 60px rgba(2, 10, 19, 0.22)',
          }}
        >
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="text-lg"
                onClick={() => (isMobile ? setMobileNavOpen(true) : setCollapsed(!collapsed))}
                style={{
                  width: isMobile ? 40 : 44,
                  height: isMobile ? 40 : 44,
                  borderRadius: isMobile ? 12 : 14,
                  border: '1px solid rgba(120, 153, 185, 0.16)',
                  background: 'rgba(6, 19, 31, 0.76)',
                  color: '#e6f6ff',
                  flexShrink: 0,
                }}
              >
                {isMobile || collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#f8fbff', fontWeight: 700, fontSize: isMobile ? 14 : 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Executive Workspace
                </div>
                {!isMobile && (
                  <div style={{ color: '#88a0b9', fontSize: 12, lineHeight: 1.2 }}>
                    Monitor operations, finance, inventory, and growth in one surface
                  </div>
                )}
              </div>
            </div>
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
              <div
                className="flex items-center gap-3 cursor-pointer"
                style={{
                  minHeight: isMobile ? 40 : 46,
                  padding: isMobile ? '0 8px 0 8px' : '6px 12px 6px 10px',
                  borderRadius: isMobile ? 12 : 15,
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
                {!isMobile && (
                  <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
                    <div style={{ color: '#f8fbff', fontWeight: 600, fontSize: 13 }}>{userName}</div>
                    <div style={{ marginTop: 3, display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {userRoles.length > 0 ? userRoles.map((r) => (
                        <span key={r.id} style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          background: 'linear-gradient(135deg, rgba(243, 250, 249, 0.41), rgba(254, 255, 255, 0.42))',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#31d3dfff',
                        }}>
                          {r.name}
                        </span>
                      )) : (
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          background: 'linear-gradient(135deg, rgba(243, 250, 249, 0.41), rgba(254, 255, 255, 0.42))',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#31d3dfff',
                        }}>
                          {user?.role ?? 'user'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'rgba(148, 163, 184, 0.12)',
                    color: '#9fb8cf',
                    marginLeft: isMobile ? 0 : 2,
                  }}
                >
                  <DownOutlined style={{ fontSize: 10 }} />
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          className="app-shell-content"
          style={{
            margin: isMobile ? '12px' : '18px 16px 16px',
            padding: isMobile ? 14 : 28,
            minHeight: 280,
            background: 'rgba(8, 25, 40, 0.62)',
            borderRadius: isMobile ? 18 : borderRadiusLG + 10,
            border: '1px solid rgba(134, 166, 197, 0.1)',
            boxShadow: '0 30px 70px rgba(2, 10, 19, 0.26)',
            backdropFilter: 'blur(18px)',
            overflow: 'hidden',
          }}
        >
          <Outlet />
        </Content>{/*  */}
      </Layout>
    </Layout>
  );
}
