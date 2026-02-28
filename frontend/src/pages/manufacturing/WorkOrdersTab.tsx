import { Table, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function WorkOrdersTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['work-orders'],
    queryFn: () => apiClient.get('/manufacturing/work-orders').then(res => res.data),
  });

  const columns = [
    { title: 'WO Number', dataIndex: 'wo_number', key: 'wo_number' },
    { title: 'Product', dataIndex: 'product_name', key: 'product_name' },
    { title: 'Quantity', dataIndex: 'quantity_to_produce', key: 'quantity_to_produce' },
    { title: 'Produced', dataIndex: 'quantity_produced', key: 'quantity_produced' },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date', render: (date: string) => new Date(date).toLocaleDateString() },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'COMPLETED' ? 'green' : status === 'IN_PROGRESS' ? 'blue' : 'orange'}>{status}</Tag> },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Work Orders</h2>
        <Button type="primary" icon={<PlusOutlined />}>Create Work Order</Button>
      </div>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
    </div>
  );
}
