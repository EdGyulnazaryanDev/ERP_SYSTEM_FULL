import { Table, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function PaymentMethodsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => apiClient.get('/accounting/bank-accounts').then(res => res.data),
  });

  const columns = [
    { title: 'Method Name', dataIndex: 'method_name', key: 'method_name' },
    { title: 'Type', dataIndex: 'method_type', key: 'method_type' },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', render: (active: boolean) => <Tag color={active ? 'green' : 'red'}>{active ? 'Yes' : 'No'}</Tag> },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Payment Methods</h2>
        <Button type="primary" icon={<PlusOutlined />}>Add Method</Button>
      </div>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
    </div>
  );
}
