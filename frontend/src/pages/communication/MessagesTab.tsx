import { Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function MessagesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: () => apiClient.get('/communication/messages').then(res => res.data),
  });

  const columns = [
    { title: 'Channel', dataIndex: 'channel_name', key: 'channel_name' },
    { title: 'Sender', dataIndex: 'sender_name', key: 'sender_name' },
    { title: 'Content', dataIndex: 'content', key: 'content', ellipsis: true },
    { title: 'Type', dataIndex: 'message_type', key: 'message_type', render: (type: string) => <Tag>{type}</Tag> },
    { title: 'Sent At', dataIndex: 'created_at', key: 'created_at', render: (date: string) => new Date(date).toLocaleString() },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Messages</h2>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
    </div>
  );
}
