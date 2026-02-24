import { Tabs } from 'antd';
import { TeamOutlined, SafetyOutlined, SettingOutlined } from '@ant-design/icons';
import RolesTab from './tabs/RolesTab';
import PermissionsTab from './tabs/PermissionsTab';
import UsersTab from './tabs/UsersTab';

export default function SettingsPage() {
  const items = [
    {
      key: 'roles',
      label: (
        <span>
          <TeamOutlined />
          Roles
        </span>
      ),
      children: <RolesTab />,
    },
    {
      key: 'permissions',
      label: (
        <span>
          <SafetyOutlined />
          Permissions
        </span>
      ),
      children: <PermissionsTab />,
    },
    {
      key: 'users',
      label: (
        <span>
          <SettingOutlined />
          User Management
        </span>
      ),
      children: <UsersTab />,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <Tabs defaultActiveKey="roles" items={items} />
    </div>
  );
}
