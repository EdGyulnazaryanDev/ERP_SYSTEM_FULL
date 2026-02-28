import { Table, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function ServiceRequestsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['service-requests'],
    queryFn: () => apiClient.get('/service-management/tickets').then(res => res.data),
  });

  const columns = [
    { title: 'Request #', dataIndex: 'request_number', key: 'request_number' },
    { title: 'Customer', dataIndex: 'customer_name', key: 'customer_name' },
    { title: 'Service Type', dataIndex: 'service_type', key: 'service_type' },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', render: (priority: string) => <Tag color={priority === 'HIGH' ? 'red' : 'blue'}>{priority}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'COMPLETED' ? 'green' : 'orange'}>{status}</Tag> },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', render: (date: string) => new Date(date).toLocaleDateString() },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Service Requests</h2>
        <Button type="primary" icon={<PlusOutlined />}>Create Request</Button>
      </div>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
    </div>
  );
}
