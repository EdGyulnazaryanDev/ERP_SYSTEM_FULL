import { Tabs } from 'antd';
import AuditLogsTab from './AuditLogsTab';
import AccessLogsTab from './AccessLogsTab';

export default function CompliancePage() {
  const items = [
    { key: 'audit-logs', label: 'Audit Logs', children: <AuditLogsTab /> },
    { key: 'access-logs', label: 'Access Logs', children: <AccessLogsTab /> },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Compliance & Audit</h1>
      <Tabs items={items} />
    </div>
  );
}
