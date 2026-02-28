import { Table, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function ProductionLinesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['production-lines'],
    queryFn: () => apiClient.get('/manufacturing/work-orders').then(res => res.data),
  });

  const columns = [
    { title: 'Line Code', dataIndex: 'line_code', key: 'line_code' },
    { title: 'Name', dataIndex: 'line_name', key: 'line_name' },
    { title: 'Capacity', dataIndex: 'capacity_per_hour', key: 'capacity_per_hour' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'OPERATIONAL' ? 'green' : 'red'}>{status}</Tag> },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Production Lines</h2>
        <Button type="primary" icon={<PlusOutlined />}>Add Production Line</Button>
      </div>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
    </div>
  );
}
