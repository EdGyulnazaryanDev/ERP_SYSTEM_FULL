import { Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function NotificationsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get('/communication/notifications').then(res => res.data),
  });

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Message', dataIndex: 'message', key: 'message', ellipsis: true },
    { title: 'Type', dataIndex: 'notification_type', key: 'notification_type', render: (type: string) => <Tag color="blue">{type}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'READ' ? 'green' : 'orange'}>{status}</Tag> },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', render: (date: string) => new Date(date).toLocaleString() },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Notifications</h2>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
    </div>
  );
}
