import { Table, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function PaymentsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => apiClient.get('/accounting/payments').then(res => res.data),
  });

  const columns = [
    { title: 'Payment #', dataIndex: 'payment_number', key: 'payment_number' },
    { title: 'Customer', dataIndex: 'customer_name', key: 'customer_name' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (amt: number) => `$${(amt || 0).toFixed(2)}` },
    { title: 'Method', dataIndex: 'payment_method', key: 'payment_method' },
    { title: 'Date', dataIndex: 'payment_date', key: 'payment_date', render: (date: string) => new Date(date).toLocaleDateString() },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'COMPLETED' ? 'green' : status === 'PENDING' ? 'orange' : 'red'}>{status}</Tag> },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Payments</h2>
        <Button type="primary" icon={<PlusOutlined />}>Record Payment</Button>
      </div>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
    </div>
  );
}
