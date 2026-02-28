import { Table, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function AssetsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => apiClient.get('/asset-management/assets').then(res => res.data),
  });

  const columns = [
    { title: 'Asset Code', dataIndex: 'asset_code', key: 'asset_code' },
    { title: 'Name', dataIndex: 'asset_name', key: 'asset_name' },
    { title: 'Category', dataIndex: 'category_name', key: 'category_name' },
    { title: 'Location', dataIndex: 'location_name', key: 'location_name' },
    { title: 'Purchase Date', dataIndex: 'purchase_date', key: 'purchase_date', render: (date: string) => new Date(date).toLocaleDateString() },
    { title: 'Value', dataIndex: 'purchase_value', key: 'purchase_value', render: (val: number) => `$${val?.toFixed(2)}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status}</Tag> },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Assets</h2>
        <Button type="primary" icon={<PlusOutlined />}>Add Asset</Button>
      </div>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
    </div>
  );
}
