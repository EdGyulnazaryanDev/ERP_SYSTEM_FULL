import { Table, Button, Tag, Space, Modal, Form, Input, Select, DatePicker, message, Card, Statistic, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import apiClient from '@/api/client';

export default function MaintenanceTab() {
  console.log('🔍 Maintenance: Loading maintenance records...');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['asset-maintenance', searchText, statusFilter, typeFilter],
    queryFn: async () => {
      console.log('🔍 Maintenance: Fetching from API...');
      const params = new URLSearchParams();
      if (searchText) params.append('search', searchText);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      
      const res = await apiClient.get(`/asset-management/records?${params.toString()}`);
      console.log('🔍 Maintenance: API response:', res.data);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('🔍 Maintenance: Creating record:', data);
      return apiClient.post('/asset-management/records', data);
    },
    onSuccess: () => {
      console.log('🔍 Maintenance: Record created successfully');
      message.success('Maintenance record created successfully');
      setCreateModalOpen(false);
      form.resetFields();
      refetch();
    },
    onError: (error: any) => {
      console.log('🔍 Maintenance: Create error:', error);
      message.error('Failed to create maintenance record');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => {
      console.log('🔍 Maintenance: Updating record:', id, data);
      return apiClient.put(`/asset-management/records/${id}`, data);
    },
    onSuccess: () => {
      console.log('🔍 Maintenance: Record updated successfully');
      message.success('Maintenance record updated successfully');
      setEditingRecord(null);
      form.resetFields();
      refetch();
    },
    onError: (error: any) => {
      console.log('🔍 Maintenance: Update error:', error);
      message.error('Failed to update maintenance record');
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => {
      console.log('🔍 Maintenance: Completing record:', id, data);
      return apiClient.post(`/asset-management/records/${id}/complete`, data);
    },
    onSuccess: () => {
      console.log('🔍 Maintenance: Record completed successfully');
      message.success('Maintenance record completed successfully');
      refetch();
    },
    onError: (error: any) => {
      console.log('🔍 Maintenance: Complete error:', error);
      message.error('Failed to complete maintenance record');
    },
  });

  const columns = [
    { title: 'Asset', dataIndex: 'asset_name', key: 'asset_name' },
    { title: 'Type', dataIndex: 'maintenance_type', key: 'maintenance_type', render: (type: string) => <Tag color={type === 'PREVENTIVE' ? 'blue' : type === 'CORRECTIVE' ? 'orange' : 'green'}>{type}</Tag> },
    { title: 'Scheduled Date', dataIndex: 'scheduled_date', key: 'scheduled_date', render: (date: string) => new Date(date).toLocaleDateString() },
    { title: 'Cost', dataIndex: 'cost', key: 'cost', render: (cost: number) => `$${cost?.toFixed(2)}` },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status', 
      render: (status: string) => (
        <Tag 
          color={status === 'COMPLETED' ? 'green' : status === 'IN_PROGRESS' ? 'blue' : 'orange'} 
          icon={status === 'COMPLETED' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
        >
          {status}
        </Tag>
      ),
      filters: [
        { text: 'Scheduled', value: 'SCHEDULED' },
        { text: 'In Progress', value: 'IN_PROGRESS' },
        { text: 'Completed', value: 'COMPLETED' },
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
              console.log('🔍 Maintenance: Editing record:', record);
              setEditingRecord(record);
              form.setFieldsValue(record);
            }}
          >
            Edit
          </Button>
          {record.status === 'SCHEDULED' || record.status === 'IN_PROGRESS' ? (
            <Button 
              type="link" 
              size="small" 
              icon={<CheckCircleOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: 'Complete Maintenance',
                  content: `Mark this maintenance record as completed?`,
                  onOk: () => completeMutation.mutate({ id: record.id, completion_date: new Date().toISOString().split('T')[0] }),
                });
              }}
            >
              Complete
            </Button>
          ) : null}
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
            <Statistic title="Total Records" value={data?.data?.length || 0} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Scheduled" value={data?.data?.filter((r: any) => r.status === 'SCHEDULED').length || 0} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="In Progress" value={data?.data?.filter((r: any) => r.status === 'IN_PROGRESS').length || 0} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Completed" value={data?.data?.filter((r: any) => r.status === 'COMPLETED').length || 0} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
      </Row>

      {/* Filters and Actions */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space>
              <Input
                placeholder="Search maintenance records..."
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
                <Select.Option value="SCHEDULED">Scheduled</Select.Option>
                <Select.Option value="IN_PROGRESS">In Progress</Select.Option>
                <Select.Option value="COMPLETED">Completed</Select.Option>
              </Select>
              <Select
                placeholder="Type"
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: 150 }}
                allowClear
              >
                <Select.Option value="">All</Select.Option>
                <Select.Option value="PREVENTIVE">Preventive</Select.Option>
                <Select.Option value="CORRECTIVE">Corrective</Select.Option>
              </Select>
            </Space>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setCreateModalOpen(true)}
            >
              Schedule Maintenance
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Maintenance Table */}
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
        title={editingRecord ? 'Edit Maintenance Record' : 'Schedule Maintenance'}
        open={createModalOpen || !!editingRecord}
        onCancel={() => {
          setCreateModalOpen(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (editingRecord) {
              updateMutation.mutate({ id: editingRecord.id, ...values });
            } else {
              createMutation.mutate(values);
            }
          }}
        >
          <Form.Item name="asset_name" label="Asset Name" rules={[{ required: true, message: 'Please select asset' }]}>
            <Select showSearch>
              <Select.Option value="">Select an asset...</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="maintenance_type" label="Maintenance Type" rules={[{ required: true, message: 'Please select maintenance type' }]}>
            <Select>
              <Select.Option value="PREVENTIVE">Preventive</Select.Option>
              <Select.Option value="CORRECTIVE">Corrective</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Please enter description' }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="scheduled_date" label="Scheduled Date" rules={[{ required: true, message: 'Please select date' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="cost" label="Estimated Cost" rules={[{ required: true, message: 'Please enter cost' }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingRecord ? 'Update' : 'Schedule'} Maintenance
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
