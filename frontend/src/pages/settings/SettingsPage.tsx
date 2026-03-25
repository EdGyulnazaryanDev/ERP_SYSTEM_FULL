import { Tabs } from 'antd';
import {
  TeamOutlined,
  SafetyOutlined,
  SettingOutlined,
  ControlOutlined,
} from '@ant-design/icons';
import RolesTab from './tabs/RolesTab';
import PermissionsTab from './tabs/PermissionsTab';
import UsersTab from './tabs/UsersTab';
import AccessGovernanceTab from './tabs/AccessGovernanceTab';
import { useAuthStore } from '@/store/authStore';
import { useAccessControl } from '@/hooks/useAccessControl';

function normalizeRole(name?: string) {
  return (name ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { userRoles } = useAccessControl();

  const isAdmin = user?.isSystemAdmin
    || normalizeRole(user?.role) === 'admin'
    || normalizeRole(user?.role) === 'superadmin'
    || userRoles.some((r) => {
      const n = normalizeRole(r.name);
      return n === 'admin' || n === 'superadmin';
    });

  const items = [
    {
      key: 'roles',
      label: <span><TeamOutlined /> Roles</span>,
      children: <RolesTab />,
    },
    {
      key: 'permissions',
      label: <span><SafetyOutlined /> Permissions</span>,
      children: <PermissionsTab />,
    },
    {
      key: 'users',
      label: <span><SettingOutlined /> User Management</span>,
      children: <UsersTab />,
    },
    ...(isAdmin ? [{
      key: 'access-governance',
      label: <span><ControlOutlined /> Access Governance</span>,
      children: <AccessGovernanceTab />,
    }] : []),
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <Tabs defaultActiveKey="roles" items={items} />
    </div>
  );
}
