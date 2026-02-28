import { Table, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function ServiceContractsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['service-contracts'],
    queryFn: () => apiClient.get('/service-management/service-contracts').then(res => res.data),
  });

  const columns = [
    { title: 'Contract #', dataIndex: 'contract_number', key: 'contract_number' },
    { title: 'Customer', dataIndex: 'customer_name', key: 'customer_name' },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date', render: (date: string) => new Date(date).toLocaleDateString() },
    { title: 'End Date', dataIndex: 'end_date', key: 'end_date', render: (date: string) => new Date(date).toLocaleDateString() },
    { title: 'Value', dataIndex: 'contract_value', key: 'contract_value', render: (val: number) => `$${(val || 0).toFixed(2)}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status}</Tag> },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Service Contracts</h2>
        <Button type="primary" icon={<PlusOutlined />}>Create Contract</Button>
      </div>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
    </div>
  );
}
