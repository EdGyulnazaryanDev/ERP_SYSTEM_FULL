import { Table, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function ChannelsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: () => apiClient.get('/communication/channels').then(res => res.data),
  });

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Type', dataIndex: 'channel_type', key: 'channel_type', render: (type: string) => <Tag>{type}</Tag> },
    { title: 'Members', dataIndex: 'member_count', key: 'member_count' },
    { title: 'Messages', dataIndex: 'message_count', key: 'message_count' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status}</Tag> },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Channels</h2>
        <Button type="primary" icon={<PlusOutlined />}>Create Channel</Button>
      </div>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
    </div>
  );
}
