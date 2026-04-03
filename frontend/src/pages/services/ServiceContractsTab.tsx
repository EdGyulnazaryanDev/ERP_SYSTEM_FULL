import { Table, Button, Tag, Modal, Form, Input, DatePicker, Select, InputNumber, message, Space, Popconfirm, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

export default function ServiceContractsTab() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['service-contracts'],
    queryFn: () => apiClient.get('/service-management/service-contracts').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/service-management/service-contracts', data),
    onSuccess: () => {
      message.success('Contract created successfully');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['service-contracts'] });
    },
    onError: () => message.error('Failed to create contract'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.put(`/service-management/service-contracts/${id}`, data),
    onSuccess: () => {
      message.success('Contract updated successfully');
      setIsModalVisible(false);
      setEditingContract(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['service-contracts'] });
    },
    onError: () => message.error('Failed to update contract'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/service-management/service-contracts/${id}`),
    onSuccess: () => {
      message.success('Contract deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['service-contracts'] });
    },
    onError: () => message.error('Failed to delete contract'),
  });

  const columns = [
    { title: 'Contract #', dataIndex: 'contract_number', key: 'contract_number' },
    { title: 'Contract Name', dataIndex: 'contract_name', key: 'contract_name' },
    { title: 'Customer', dataIndex: 'customer_name', key: 'customer_name' },
    { title: 'Type', dataIndex: 'contract_type', key: 'contract_type', render: (type: string) => <Tag>{type}</Tag> },
    { title: 'Start Date', dataIndex: 'start_date', key: 'start_date', render: (date: string) => dayjs(date).format('MMM DD, YYYY') },
    { title: 'End Date', dataIndex: 'end_date', key: 'end_date', render: (date: string) => dayjs(date).format('MMM DD, YYYY') },
    { title: 'Value', dataIndex: 'contract_value', key: 'contract_value', render: (val: number) => `$${(val || 0).toFixed(2)}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => {
      const colorMap: Record<string, string> = {
        'ACTIVE': 'green',
        'DRAFT': 'blue',
        'EXPIRED': 'red',
        'CANCELLED': 'orange',
        'RENEWED': 'purple'
      };
      return <Tag color={colorMap[status] || 'default'}>{status}</Tag> }},
    { 
      title: 'Actions', 
      key: 'actions', 
      render: (_, record: any) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Are you sure to delete this contract?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              icon={<DeleteOutlined />} 
              size="small" 
              danger 
            />
          </Popconfirm>
        </Space>
      )
    },
  ];

  const handleCreate = () => {
    setEditingContract(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (contract: any) => {
    setEditingContract(contract);
    form.setFieldsValue({
      ...contract,
      start_date: dayjs(contract.start_date),
      end_date: dayjs(contract.end_date),
    });
    setIsModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    const submitData = {
      ...values,
      start_date: values.start_date.toISOString(),
      end_date: values.end_date.toISOString(),
    };

    if (editingContract) {
      updateMutation.mutate({ id: editingContract.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Service Contracts</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Create Contract</Button>
      </div>
      <Table columns={columns} dataSource={data?.data || []} loading={isLoading} rowKey="id" />
      
      <Modal
        title={editingContract ? 'Edit Contract' : 'Create Contract'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item name="contract_number" label="Contract Number" rules={[{ required: true }]}>
            <Input placeholder="SC-001" />
          </Form.Item>
          
          <Form.Item name="contract_name" label="Contract Name" rules={[{ required: true }]}>
            <Input placeholder="Annual Maintenance Contract" />
          </Form.Item>
          
          <Form.Item name="customer_name" label="Customer Name" rules={[{ required: true }]}>
            <Input placeholder="Customer Company Name" />
          </Form.Item>
          
          <Form.Item name="contract_type" label="Contract Type" rules={[{ required: true }]}>
            <Select placeholder="Select contract type">
              <Option value="maintenance">Maintenance</Option>
              <Option value="support">Support</Option>
              <Option value="warranty">Warranty</Option>
              <Option value="sla">SLA</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select placeholder="Select status">
              <Option value="draft">Draft</Option>
              <Option value="active">Active</Option>
              <Option value="expired">Expired</Option>
              <Option value="cancelled">Cancelled</Option>
              <Option value="renewed">Renewed</Option>
            </Select>
          </Form.Item>
          
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="start_date" label="Start Date" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item name="end_date" label="End Date" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="contract_value" label="Contract Value ($)" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} placeholder="10000.00" />
            </Form.Item>
            
            <Form.Item name="billing_frequency" label="Billing Frequency" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Select frequency">
                <Option value="monthly">Monthly</Option>
                <Option value="quarterly">Quarterly</Option>
                <Option value="semi_annual">Semi-Annual</Option>
                <Option value="annual">Annual</Option>
                <Option value="one_time">One Time</Option>
              </Select>
            </Form.Item>
          </div>
          
          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Contract description and terms..." />
          </Form.Item>
          
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="included_service_hours" label="Included Service Hours" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} placeholder="40" />
            </Form.Item>
            
            <Form.Item name="auto_renew" valuePropName="checked" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', height: '32px' }}>
                <Switch /> <span style={{ marginLeft: 8 }}>Auto-renew</span>
              </div>
            </Form.Item>
          </div>
          
          <Form.Item name="terms_and_conditions" label="Terms and Conditions">
            <TextArea rows={4} placeholder="Detailed terms and conditions..." />
          </Form.Item>
          
          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="Additional notes..." />
          </Form.Item>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingContract ? 'Update' : 'Create'} Contract
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
