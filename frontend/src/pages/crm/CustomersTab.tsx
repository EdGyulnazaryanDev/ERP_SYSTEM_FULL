import { Table, Button, Tag, Space, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '@/api/crm';
import { useState } from 'react';

export default function CustomersTab() {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => crmApi.getCustomers().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => crmApi.createCustomer(data),
    onSuccess: () => {
      message.success('Customer created successfully');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create customer');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => crmApi.updateCustomer(id, data),
    onSuccess: () => {
      message.success('Customer updated successfully');
      setIsModalVisible(false);
      setEditingCustomer(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update customer');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteCustomer(id),
    onSuccess: () => {
      message.success('Customer deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete customer');
    }
  });

  const handleAdd = () => {
    setEditingCustomer(null);
    setIsModalVisible(true);
    setTimeout(() => {
      form.resetFields();
    }, 0);
  };

  const handleEdit = (record: any) => {
    setEditingCustomer(record);
    setIsModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue(record);
    }, 0);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      if (editingCustomer) {
        updateMutation.mutate({ id: editingCustomer.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    });
  };

  const columns = [
    { title: 'Code', dataIndex: 'customer_code', key: 'customer_code' },
    { title: 'Company', dataIndex: 'company_name', key: 'company_name' },
    { title: 'Contact Person', dataIndex: 'contact_person', key: 'contact_person' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Type', dataIndex: 'customer_type', key: 'customer_type', render: (type: string) => {
        if (!type) return null;
        return <Tag color={type === 'B2B' ? 'blue' : 'cyan'}>{type}</Tag>
      }
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => {
        if (!status) return null;
        return <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status}</Tag>
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          <Popconfirm
            title="Delete this customer?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-semibold">Customers</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Add Customer</Button>
      </div>
      <Table columns={columns} dataSource={data || []} loading={isLoading} rowKey="id" />

      <Modal
        title={editingCustomer ? "Edit Customer" : "Add Customer"}
        open={isModalVisible}
        forceRender
        onOk={handleModalOk}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={800}
      >
        <Form form={form} layout="vertical" className="grid grid-cols-2 gap-x-4">
          <Form.Item name="customer_code" label="Customer Code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="company_name" label="Company Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contact_person" label="Contact Person">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="mobile" label="Mobile">
            <Input />
          </Form.Item>
          <Form.Item name="customer_type" label="Customer Type">
            <Select options={[
              { value: 'B2B', label: 'B2B' },
              { value: 'B2C', label: 'B2C' },
            ]} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]} />
          </Form.Item>
          <Form.Item name="industry" label="Industry">
            <Input />
          </Form.Item>
          <Form.Item name="website" label="Website">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
