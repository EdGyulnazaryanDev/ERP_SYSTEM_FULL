import { useState, useMemo } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, Select, message, Popconfirm, Row, Col, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, TeamOutlined, UserOutlined, StopOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '@/api/crm';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  active:   { color: '#52c41a', bg: '#f6ffed', label: 'Active' },
  inactive: { color: '#8fa3b8', bg: 'rgba(255,255,255,0.04)', label: 'Inactive' },
  prospect: { color: '#fa8c16', bg: '#fff7e6', label: 'Prospect' },
  blocked:  { color: '#ff4d4f', bg: '#fff2f0', label: 'Blocked' },
};

const TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  business:   { color: '#1677ff', label: 'Business' },
  individual: { color: '#13c2c2', label: 'Individual' },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { color: '#8fa3b8', bg: 'rgba(255,255,255,0.04)', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      fontSize: 11, fontWeight: 600,
    }}>
      {cfg.label.toUpperCase()}
    </span>
  );
}

export default function CustomersTab() {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => crmApi.getCustomers().then(res => res.data),
  });

  const customers = Array.isArray(data) ? data : (data?.data || []);

  const createMutation = useMutation({
    mutationFn: (data: any) => crmApi.createCustomer(data),
    onSuccess: () => { message.success('Customer created'); setIsModalVisible(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['customers'] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to create customer'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmApi.updateCustomer(id, data),
    onSuccess: () => { message.success('Customer updated'); setIsModalVisible(false); setEditingCustomer(null); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['customers'] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to update customer'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteCustomer(id),
    onSuccess: () => { message.success('Customer deleted'); queryClient.invalidateQueries({ queryKey: ['customers'] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to delete customer'),
  });

  const filtered = useMemo(() => customers.filter((c: any) => {
    const matchSearch = !searchQuery || `${c.company_name} ${c.contact_person} ${c.email} ${c.customer_code}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    const matchType = !typeFilter || c.customer_type === typeFilter;
    return matchSearch && matchStatus && matchType;
  }), [customers, searchQuery, statusFilter, typeFilter]);

  const handleAdd = () => { setEditingCustomer(null); setIsModalVisible(true); setTimeout(() => form.resetFields(), 0); };
  const handleEdit = (record: any) => { setEditingCustomer(record); setIsModalVisible(true); setTimeout(() => form.setFieldsValue(record), 0); };
  const handleModalOk = () => {
    form.validateFields().then(values => {
      if (editingCustomer) updateMutation.mutate({ id: editingCustomer.id, data: values });
      else createMutation.mutate(values);
    });
  };

  const columns = [
    { title: 'Code', dataIndex: 'customer_code', key: 'customer_code', width: 110,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--app-text-muted)' }}>{v}</span> },
    { title: 'Company', dataIndex: 'company_name', key: 'company_name', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Contact', dataIndex: 'contact_person', key: 'contact_person' },
    { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Type', dataIndex: 'customer_type', key: 'customer_type', width: 110,
      render: (type: string) => {
        const cfg = TYPE_CONFIG[type] || { color: 'default', label: type };
        return type ? <Tag color={cfg.color} style={{ fontSize: 11, fontWeight: 600 }}>{cfg.label}</Tag> : null;
      }
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 110,
      render: (status: string) => status ? <StatusPill status={status} /> : null },
    {
      title: 'Actions', key: 'actions', width: 90,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete this customer?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Yes" cancelText="No">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const activeCount = customers.filter((c: any) => c.status === 'active').length;
  const prospectCount = customers.filter((c: any) => c.status === 'prospect').length;
  const blockedCount = customers.filter((c: any) => c.status === 'blocked').length;

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Filters bar */}
      <div style={{ padding: '0 4px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            placeholder="Search customers..."
            prefix={<SearchOutlined style={{ color: 'var(--app-text-soft)' }} />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: 220, borderRadius: 8 }}
          />
          <Select placeholder="Status" allowClear style={{ width: 130 }} value={statusFilter || undefined} onChange={v => setStatusFilter(v || '')}>
            <Select.Option value="active">Active</Select.Option>
            <Select.Option value="inactive">Inactive</Select.Option>
            <Select.Option value="prospect">Prospect</Select.Option>
            <Select.Option value="blocked">Blocked</Select.Option>
          </Select>
          <Select placeholder="Type" allowClear style={{ width: 130 }} value={typeFilter || undefined} onChange={v => setTypeFilter(v || '')}>
            <Select.Option value="business">Business</Select.Option>
            <Select.Option value="individual">Individual</Select.Option>
          </Select>
          <span style={{ color: 'var(--app-text-muted)', fontSize: 13 }}>{filtered.length} customers</span>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }} onClick={handleAdd}>Add Customer</Button>
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        rowClassName={(record: any) => {
          if (record.status === 'blocked') return 'row-blocked';
          if (record.status === 'inactive') return 'row-inactive';
          return '';
        }}
      />

      <Modal
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        open={isModalVisible}
        forceRender
        onOk={handleModalOk}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={800}
      >
        <Form form={form} layout="vertical" className="grid grid-cols-2 gap-x-4">
          <Form.Item name="customer_code" label="Customer Code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="company_name" label="Company Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="contact_person" label="Contact Person"><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Phone"><Input /></Form.Item>
          <Form.Item name="mobile" label="Mobile"><Input /></Form.Item>
          <Form.Item name="customer_type" label="Customer Type">
            <Select options={[{ value: 'individual', label: 'Individual' }, { value: 'business', label: 'Business' }]} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'prospect', label: 'Prospect' }, { value: 'blocked', label: 'Blocked' }]} />
          </Form.Item>
          <Form.Item name="industry" label="Industry"><Input /></Form.Item>
          <Form.Item name="website" label="Website"><Input /></Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-blocked td { background: rgba(255,77,79,0.10) !important; opacity: 0.88; }
        .row-inactive td { background: rgba(255,255,255,0.02) !important; opacity: 0.75; }
      `}</style>
    </div>
  );
}
