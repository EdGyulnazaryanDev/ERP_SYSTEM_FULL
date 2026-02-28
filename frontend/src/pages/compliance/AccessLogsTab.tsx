import { Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function AccessLogsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['access-logs'],
    queryFn: () => apiClient.get('/compliance-audit/access-logs').then(res => res.data),
  });

  const columns = [
    { title: 'User', dataIndex: 'user_name', key: 'user_name' },
    { title: 'Access Type', dataIndex: 'access_type', key: 'access_type', render: (type: string) => <Tag>{type}</Tag> },
    { title: 'Resource', dataIndex: 'resource_type', key: 'resource_type' },
    { title: 'Result', dataIndex: 'result', key: 'result', render: (result: string) => <Tag color={result === 'GRANTED' ? 'green' : 'red'}>{result}</Tag> },
    { title: 'IP Address', dataIndex: 'ip_address', key: 'ip_address' },
    { title: 'Timestamp', dataIndex: 'accessed_at', key: 'accessed_at', render: (date: string) => new Date(date).toLocaleString() },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Access Logs</h2>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" scroll={{ x: 1200 }} />
    </div>
  );
}
