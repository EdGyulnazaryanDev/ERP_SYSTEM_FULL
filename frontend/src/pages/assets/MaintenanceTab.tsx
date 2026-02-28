import { Table, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function MaintenanceTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['asset-maintenance'],
    queryFn: () => apiClient.get('/asset-management/records').then(res => res.data),
  });

  const columns = [
    { title: 'Asset', dataIndex: 'asset_name', key: 'asset_name' },
    { title: 'Type', dataIndex: 'maintenance_type', key: 'maintenance_type', render: (type: string) => <Tag>{type}</Tag> },
    { title: 'Scheduled Date', dataIndex: 'scheduled_date', key: 'scheduled_date', render: (date: string) => new Date(date).toLocaleDateString() },
    { title: 'Cost', dataIndex: 'cost', key: 'cost', render: (cost: number) => `$${cost?.toFixed(2)}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'COMPLETED' ? 'green' : 'orange'}>{status}</Tag> },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Maintenance</h2>
        <Button type="primary" icon={<PlusOutlined />}>Schedule Maintenance</Button>
      </div>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
    </div>
  );
}
