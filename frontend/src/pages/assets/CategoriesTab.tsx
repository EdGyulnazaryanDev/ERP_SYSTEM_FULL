import { Table, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function CategoriesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: () => apiClient.get('/asset-management/categories').then(res => res.data),
  });

  const columns = [
    { title: 'Category Name', dataIndex: 'category_name', key: 'category_name' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Depreciation Method', dataIndex: 'depreciation_method', key: 'depreciation_method' },
    { title: 'Useful Life (years)', dataIndex: 'useful_life_years', key: 'useful_life_years' },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Asset Categories</h2>
        <Button type="primary" icon={<PlusOutlined />}>Add Category</Button>
      </div>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
    </div>
  );
}
