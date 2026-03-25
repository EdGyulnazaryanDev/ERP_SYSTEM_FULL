import { Tabs, Alert } from 'antd';
import { TeamOutlined, SafetyOutlined, SettingOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import RolesTab from './tabs/RolesTab';
import PermissionsTab from './tabs/PermissionsTab';
import UsersTab from './tabs/UsersTab';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const navigate = useNavigate();

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
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <Alert
        type="info"
        showIcon
        icon={<SafetyCertificateOutlined />}
        message="Access Governance"
        description="Manage page-level permissions for each role from the Access Governance section."
        action={
          <a onClick={() => navigate('/rbac')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
            Go to Access Governance →
          </a>
        }
        style={{ marginBottom: 20 }}
      />
      <Tabs defaultActiveKey="roles" items={items} />
    </div>
  );
}
