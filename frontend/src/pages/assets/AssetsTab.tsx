import { Table, Button, Tag, Space, Input, Select, DatePicker, Modal, Form, message, Card, Statistic, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, FilterOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import apiClient from '@/api/client';

export default function AssetsTab() {
  console.log('🔍 Assets: Loading assets...');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['assets', searchText, statusFilter, categoryFilter, locationFilter],
    queryFn: async () => {
      console.log('🔍 Assets: Fetching from API...');
      const params = new URLSearchParams();
      if (searchText) params.append('search', searchText);
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (locationFilter) params.append('location', locationFilter);
      
      const res = await apiClient.get(`/asset-management/assets?${params.toString()}`);
      console.log('🔍 Assets: API response:', res.data);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('🔍 Assets: Creating asset:', data);
      return apiClient.post('/asset-management/assets', data);
    },
    onSuccess: () => {
      console.log('🔍 Assets: Asset created successfully');
      message.success('Asset created successfully');
      setCreateModalOpen(false);
      form.resetFields();
      refetch();
    },
    onError: (error: any) => {
      console.log('🔍 Assets: Create error:', error);
      message.error('Failed to create asset');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => {
      console.log('🔍 Assets: Updating asset:', id, data);
      return apiClient.put(`/asset-management/assets/${id}`, data);
    },
    onSuccess: () => {
      console.log('🔍 Assets: Asset updated successfully');
      message.success('Asset updated successfully');
      setEditingAsset(null);
      form.resetFields();
      refetch();
    },
    onError: (error: any) => {
      console.log('🔍 Assets: Update error:', error);
      message.error('Failed to update asset');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      console.log('🔍 Assets: Deleting asset:', id);
      return apiClient.delete(`/asset-management/assets/${id}`);
    },
    onSuccess: () => {
      console.log('🔍 Assets: Asset deleted successfully');
      message.success('Asset deleted successfully');
      refetch();
    },
    onError: (error: any) => {
      console.log('🔍 Assets: Delete error:', error);
      message.error('Failed to delete asset');
    },
  });

  const columns = [
    { title: 'Asset Code', dataIndex: 'asset_code', key: 'asset_code' },
    { title: 'Name', dataIndex: 'asset_name', key: 'asset_name' },
    { title: 'Category', dataIndex: 'category_name', key: 'category_name' },
    { title: 'Location', dataIndex: 'location_name', key: 'location_name' },
    { title: 'Purchase Date', dataIndex: 'purchase_date', key: 'purchase_date', render: (date: string) => new Date(date).toLocaleDateString() },
    { title: 'Value', dataIndex: 'purchase_value', key: 'purchase_value', render: (val: number) => `$${val?.toFixed(2)}` },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status', 
      render: (status: string) => <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status}</Tag>,
      filters: [
        { text: 'Active', value: 'ACTIVE' },
        { text: 'Inactive', value: 'INACTIVE' },
      ]
    },
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
              console.log('🔍 Assets: Editing asset:', record);
              setEditingAsset(record);
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
                title: 'Delete Asset',
                content: `Are you sure you want to delete "${record.asset_name}"?`,
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
        <Col span={6}>
          <Card>
            <Statistic title="Total Assets" value={data?.data?.length || 0} prefix={<PlusOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Active Assets" value={data?.data?.filter((a: any) => a.status === 'ACTIVE').length || 0} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total Value" value={data?.data?.reduce((sum: number, a: any) => sum + (a.purchase_value || 0), 0).toFixed(2)} prefix="$" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Inactive Assets" value={data?.data?.filter((a: any) => a.status === 'INACTIVE').length || 0} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
      </Row>

      {/* Filters and Actions */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space>
              <Input
                placeholder="Search assets..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 200 }}
              />
              <Select
                placeholder="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 120 }}
                allowClear
              >
                <Select.Option value="">All</Select.Option>
                <Select.Option value="ACTIVE">Active</Select.Option>
                <Select.Option value="INACTIVE">Inactive</Select.Option>
              </Select>
              <Select
                placeholder="Category"
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: 150 }}
                allowClear
              >
                <Select.Option value="">All</Select.Option>
                <Select.Option value="IT Equipment">IT Equipment</Select.Option>
                <Select.Option value="Furniture">Furniture</Select.Option>
                <Select.Option value="Vehicles">Vehicles</Select.Option>
              </Select>
              <Select
                placeholder="Location"
                value={locationFilter}
                onChange={setLocationFilter}
                style={{ width: 150 }}
                allowClear
              >
                <Select.Option value="">All</Select.Option>
                <Select.Option value="Office">Office</Select.Option>
                <Select.Option value="Warehouse">Warehouse</Select.Option>
                <Select.Option value="Remote">Remote</Select.Option>
              </Select>
            </Space>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setCreateModalOpen(true)}
            >
              Add Asset
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Assets Table */}
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
        title={editingAsset ? 'Edit Asset' : 'Create Asset'}
        open={createModalOpen || !!editingAsset}
        onCancel={() => {
          setCreateModalOpen(false);
          setEditingAsset(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (editingAsset) {
              updateMutation.mutate({ id: editingAsset.id, ...values });
            } else {
              createMutation.mutate(values);
            }
          }}
        >
          <Form.Item name="asset_name" label="Asset Name" rules={[{ required: true, message: 'Please enter asset name' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="asset_code" label="Asset Code" rules={[{ required: true, message: 'Please enter asset code' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category_name" label="Category">
            <Select>
              <Select.Option value="IT Equipment">IT Equipment</Select.Option>
              <Select.Option value="Furniture">Furniture</Select.Option>
              <Select.Option value="Vehicles">Vehicles</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="location_name" label="Location">
            <Select>
              <Select.Option value="Office">Office</Select.Option>
              <Select.Option value="Warehouse">Warehouse</Select.Option>
              <Select.Item value="Remote">Remote</Select.Item>
            </Select>
          </Form.Item>
          <Form.Item name="purchase_value" label="Purchase Value" rules={[{ required: true, message: 'Please enter purchase value' }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="purchase_date" label="Purchase Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingAsset ? 'Update' : 'Create'} Asset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
