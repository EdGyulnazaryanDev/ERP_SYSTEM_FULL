import { Table, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '@/api/crm';
import { useState } from 'react';

export default function ContactsTab() {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Fetch all customers for the filter selector and creating contacts
  const { data: customersRes, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => crmApi.getCustomers().then(res => res.data),
  });

  const customers = customersRes?.data || [];

  // Automatically select the first customer if none is selected and customers exist
  if (!selectedCustomerId && customers.length > 0) {
    setSelectedCustomerId(customers[0].id);
  }

  // Fetch contacts for the selected customer
  const { data: contactsRes, isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts', selectedCustomerId],
    queryFn: () => {
      if (!selectedCustomerId) return Promise.resolve({ data: [] });
      return crmApi.getContacts(selectedCustomerId).then(res => res.data);
    },
    enabled: !!selectedCustomerId,
  });

  const data = contactsRes?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => crmApi.createContact(data),
    onSuccess: () => {
      message.success('Contact created successfully');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['contacts', selectedCustomerId] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to create contact');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => crmApi.updateContact(id, data),
    onSuccess: () => {
      message.success('Contact updated successfully');
      setIsModalVisible(false);
      setEditingContact(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['contacts', selectedCustomerId] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to update contact');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteContact(id),
    onSuccess: () => {
      message.success('Contact deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['contacts', selectedCustomerId] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Failed to delete contact');
    }
  });

  const handleAdd = () => {
    setEditingContact(null);
    setIsModalVisible(true);
    setTimeout(() => {
      form.resetFields();
      if (selectedCustomerId) {
        form.setFieldsValue({ customer_id: selectedCustomerId });
      }
    }, 0);
  };

  const handleEdit = (record: any) => {
    setEditingContact(record);
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
      if (editingContact) {
        updateMutation.mutate({ id: editingContact.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    });
  };

  const columns = [
    { title: 'Name', key: 'name', render: (_: any, record: any) => `${record.first_name} ${record.last_name}` },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Position', dataIndex: 'position', key: 'position' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          <Popconfirm
            title="Delete this contact?"
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

  if (customers.length === 0 && !customersLoading) {
    return (
      <div className="p-8">
        <Empty description="No customers found. Please create a customer first to add contacts." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-semibold">Contacts</h2>

        <div className="flex gap-4">
          <Select
            className="w-64"
            placeholder="Select a customer"
            options={customers.map((c: any) => ({ value: c.id, label: c.company_name }))}
            value={selectedCustomerId}
            onChange={(value) => setSelectedCustomerId(value)}
            loading={customersLoading}
            showSearch
            optionFilterProp="label"
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} disabled={!selectedCustomerId}>
            Add Contact
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        loading={contactsLoading || customersLoading}
        rowKey="id"
      />

      <Modal
        title={editingContact ? "Edit Contact" : "Add Contact"}
        open={isModalVisible}
        forceRender
        onOk={handleModalOk}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" className="grid grid-cols-2 gap-x-4">
          <Form.Item name="customer_id" label="Customer" rules={[{ required: true }]} className="col-span-2">
            <Select
              options={customers.map((c: any) => ({ value: c.id, label: c.company_name }))}
              disabled
            />
          </Form.Item>
          <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="position" label="Position">
            <Input />
          </Form.Item>
          <Form.Item name="department" label="Department">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
