import { Table, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function BOMTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['bom'],
    queryFn: () => apiClient.get('/manufacturing/boms').then(res => res.data),
  });

  const columns = [
    { title: 'BOM Code', dataIndex: 'bom_code', key: 'bom_code' },
    { title: 'Product', dataIndex: 'product_name', key: 'product_name' },
    { title: 'Version', dataIndex: 'version', key: 'version' },
    { title: 'Components', dataIndex: 'component_count', key: 'component_count' },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Bill of Materials</h2>
        <Button type="primary" icon={<PlusOutlined />}>Create BOM</Button>
      </div>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
    </div>
  );
}
