import { Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function AuditLogsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => apiClient.get('/compliance-audit/audit-logs').then(res => res.data),
  });

  const columns = [
    { title: 'User', dataIndex: 'user_name', key: 'user_name' },
    { title: 'Action', dataIndex: 'action', key: 'action', render: (action: string) => <Tag color="blue">{action}</Tag> },
    { title: 'Entity Type', dataIndex: 'entity_type', key: 'entity_type' },
    { title: 'Entity ID', dataIndex: 'entity_id', key: 'entity_id' },
    { title: 'Severity', dataIndex: 'severity', key: 'severity', render: (severity: string) => <Tag color={severity === 'CRITICAL' ? 'red' : severity === 'HIGH' ? 'orange' : 'blue'}>{severity}</Tag> },
    { title: 'Timestamp', dataIndex: 'created_at', key: 'created_at', render: (date: string) => new Date(date).toLocaleString() },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Audit Logs</h2>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" scroll={{ x: 1200 }} />
    </div>
  );
}
