import { Table, Button, Tag, Space, Modal, Form, Input, message, Card, Statistic, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import apiClient from '@/api/client';

export default function CategoriesTab() {
  console.log('🔍 Categories: Loading categories...');
  const [searchText, setSearchText] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['asset-categories', searchText],
    queryFn: async () => {
      console.log('🔍 Categories: Fetching from API...');
      const params = new URLSearchParams();
      if (searchText) params.append('search', searchText);
      
      const res = await apiClient.get(`/asset-management/categories?${params.toString()}`);
      console.log('🔍 Categories: API response:', res.data);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('🔍 Categories: Creating category:', data);
      return apiClient.post('/asset-management/categories', data);
    },
    onSuccess: () => {
      console.log('🔍 Categories: Category created successfully');
      message.success('Category created successfully');
      setCreateModalOpen(false);
      form.resetFields();
      refetch();
    },
    onError: (error: any) => {
      console.log('🔍 Categories: Create error:', error);
      message.error('Failed to create category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => {
      console.log('🔍 Categories: Updating category:', id, data);
      return apiClient.put(`/asset-management/categories/${id}`, data);
    },
    onSuccess: () => {
      console.log('🔍 Categories: Category updated successfully');
      message.success('Category updated successfully');
      setEditingCategory(null);
      form.resetFields();
      refetch();
    },
    onError: (error: any) => {
      console.log('🔍 Categories: Update error:', error);
      message.error('Failed to update category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      console.log('🔍 Categories: Deleting category:', id);
      return apiClient.delete(`/asset-management/categories/${id}`);
    },
    onSuccess: () => {
      console.log('🔍 Categories: Category deleted successfully');
      message.success('Category deleted successfully');
      refetch();
    },
    onError: (error: any) => {
      console.log('🔍 Categories: Delete error:', error);
      message.error('Failed to delete category');
    },
  });

  const columns = [
    { title: 'Category Name', dataIndex: 'category_name', key: 'category_name' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Depreciation Method', dataIndex: 'depreciation_method', key: 'depreciation_method' },
    { title: 'Useful Life (years)', dataIndex: 'useful_life_years', key: 'useful_life_years' },
    { 
      title: 'Actions',
      key: 'actions',
      render: (_, record: any) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => {
              console.log('🔍 Categories: Editing category:', record);
              setEditingCategory(record);
              form.setFieldsValue(record);
            }}
          >
            Edit
          </Button>
          <Button 
            type="link" 
            size="small" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: 'Delete Category',
                content: `Are you sure you want to delete "${record.category_name}"?`,
                onOk: () => deleteMutation.mutate(record.id),
              });
            }}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic title="Total Categories" value={data?.data?.length || 0} prefix={<PlusOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Active Categories" value={data?.data?.filter((c: any) => c.description).length || 0} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Avg. Life (years)" value={data?.data?.reduce((sum: number, c: any) => sum + (c.useful_life_years || 0), 0) / (data?.data?.length || 1)} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      {/* Filters and Actions */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space>
              <Input
                placeholder="Search categories..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 200 }}
              />
            </Space>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setCreateModalOpen(true)}
            >
              Add Category
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Categories Table */}
      <Table 
        columns={columns} 
        dataSource={data?.data || []} 
        loading={isLoading} 
        rowKey="id"
        pagination={{
          total: data?.data?.length || 0,
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      {/* Create/Edit Modal */}
      <Modal
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        open={createModalOpen || !!editingCategory}
        onCancel={() => {
          setCreateModalOpen(false);
          setEditingCategory(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (editingCategory) {
              updateMutation.mutate({ id: editingCategory.id, ...values });
            } else {
              createMutation.mutate(values);
            }
          }}
        >
          <Form.Item name="category_name" label="Category Name" rules={[{ required: true, message: 'Please enter category name' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="depreciation_method" label="Depreciation Method">
            <Select>
              <Select.Option value="Straight Line">Straight Line</Select.Option>
              <Select.Option value="Declining Balance">Declining Balance</Select.Option>
              <Select.Option value="Double Declining">Double Declining</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="useful_life_years" label="Useful Life (years)" rules={[{ required: true, message: 'Please enter useful life' }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingCategory ? 'Update' : 'Create'} Category
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
