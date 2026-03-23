import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '@/api/crm';

export default function ContactsTab() {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data: customersRes, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => crmApi.getCustomers().then(res => res.data),
  });

  const customers = Array.isArray(customersRes) ? customersRes : (customersRes?.data || []);

  if (!selectedCustomerId && customers.length > 0) {
    setSelectedCustomerId(customers[0].id);
  }

  const { data: contactsRes, isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts', selectedCustomerId],
    queryFn: () => {
      if (!selectedCustomerId) return Promise.resolve({ data: [] });
      return crmApi.getContacts(selectedCustomerId).then(res => res.data);
    },
    enabled: !!selectedCustomerId,
  });

  const contacts = Array.isArray(contactsRes) ? contactsRes : (contactsRes?.data || []);

  const createMutation = useMutation({
    mutationFn: (data: any) => crmApi.createContact(data),
    onSuccess: () => { message.success('Contact created'); setIsModalVisible(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['contacts', selectedCustomerId] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to create contact'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmApi.updateContact(id, data),
    onSuccess: () => { message.success('Contact updated'); setIsModalVisible(false); setEditingContact(null); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['contacts', selectedCustomerId] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to update contact'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteContact(id),
    onSuccess: () => { message.success('Contact deleted'); queryClient.invalidateQueries({ queryKey: ['contacts', selectedCustomerId] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to delete contact'),
  });

  const handleAdd = () => {
    setEditingContact(null); setIsModalVisible(true);
    setTimeout(() => { form.resetFields(); if (selectedCustomerId) form.setFieldsValue({ customer_id: selectedCustomerId }); }, 0);
  };
  const handleEdit = (record: any) => { setEditingContact(record); setIsModalVisible(true); setTimeout(() => form.setFieldsValue(record), 0); };
  const handleModalOk = () => {
    form.validateFields().then(values => {
      if (editingContact) updateMutation.mutate({ id: editingContact.id, data: values });
      else createMutation.mutate(values);
    });
  };

  const columns = [
    { title: 'Name', key: 'name',
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e6f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1677ff', fontSize: 12 }}>
            <UserOutlined />
          </div>
          <span style={{ fontWeight: 600 }}>{record.first_name} {record.last_name}</span>
        </div>
      )
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Position', dataIndex: 'position', key: 'position' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    {
      title: 'Actions', key: 'actions', width: 90,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete this contact?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Yes" cancelText="No">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (customers.length === 0 && !customersLoading) {
    return <div className="p-8"><Empty description="No customers found. Please create a customer first." /></div>;
  }

  const selectedCustomer = customers.find((c: any) => c.id === selectedCustomerId);

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ padding: '0 4px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space wrap>
          <Select
            style={{ width: 260, borderRadius: 8 }}
            placeholder="Select a customer"
            options={customers.map((c: any) => ({ value: c.id, label: c.company_name }))}
            value={selectedCustomerId}
            onChange={value => setSelectedCustomerId(value)}
            loading={customersLoading}
            showSearch
            optionFilterProp="label"
          />
          {selectedCustomer && (
            <span style={{ color: 'var(--app-text-muted)', fontSize: 13 }}>{contacts.length} contacts</span>
          )}
        </Space>
        <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }} onClick={handleAdd} disabled={!selectedCustomerId}>
          Add Contact
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={contacts}
        loading={contactsLoading || customersLoading}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingContact ? 'Edit Contact' : 'Add Contact'}
        open={isModalVisible}
        forceRender
        onOk={handleModalOk}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" className="grid grid-cols-2 gap-x-4">
          <Form.Item name="customer_id" label="Customer" rules={[{ required: true }]} className="col-span-2">
            <Select options={customers.map((c: any) => ({ value: c.id, label: c.company_name }))} disabled />
          </Form.Item>
          <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Phone"><Input /></Form.Item>
          <Form.Item name="position" label="Position"><Input /></Form.Item>
          <Form.Item name="department" label="Department"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
