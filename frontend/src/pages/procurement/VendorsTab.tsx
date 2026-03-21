import { useState, useMemo } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Switch } from 'antd';
import { PlusOutlined, EditOutlined, TeamOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';

function StatusPill({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: active ? '#f6ffed' : '#f5f5f5',
      color: active ? '#52c41a' : '#8c8c8c',
      border: `1px solid ${active ? '#52c41a33' : '#d9d9d9'}`,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {active ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
      {active ? 'ACTIVE' : 'INACTIVE'}
    </span>
  );
}

export default function VendorsTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => apiClient.get('/suppliers').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => apiClient.post('/suppliers', d),
    onSuccess: () => {
      message.success('Vendor created');
      setIsModalVisible(false);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to add vendor'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/suppliers/${id}`, data),
    onSuccess: () => {
      message.success('Vendor updated');
      setIsModalVisible(false);
      setEditingRecord(null);
      setTimeout(() => form.resetFields(), 0);
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update vendor'),
  });

  const handleSubmit = (values: any) => {
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const rawList: any[] = useMemo(
    () => Array.isArray(data) ? data : (data?.data || []),
    [data]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return rawList;
    const q = search.toLowerCase();
    return rawList.filter(v =>
      (v.name || '').toLowerCase().includes(q) ||
      (v.email || '').toLowerCase().includes(q) ||
      (v.contact_person || '').toLowerCase().includes(q)
    );
  }, [rawList, search]);

  const activeCount = rawList.filter(v => v.is_active !== false).length;
  const inactiveCount = rawList.length - activeCount;

  const columns = [
    {
      title: 'Vendor Name', dataIndex: 'name', key: 'name',
      render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    { title: 'Contact Person', dataIndex: 'contact_person', key: 'contact_person' },
    {
      title: 'Email', dataIndex: 'email', key: 'email',
      render: (v: string) => v ? <a href={`mailto:${v}`} style={{ fontSize: 12 }}>{v}</a> : '—',
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (v: string) => v || '—' },
    {
      title: 'Status', dataIndex: 'is_active', key: 'is_active', width: 120,
      render: (active: boolean) => <StatusPill active={active !== false} />,
    },
    {
      title: 'Actions', key: 'actions', width: 80, align: 'center' as const,
      render: (_: any, record: any) => (
        <Button
          type="text" size="small" icon={<EditOutlined />}
          onClick={() => {
            setEditingRecord(record);
            setIsModalVisible(true);
            setTimeout(() => form.setFieldsValue(record), 0);
          }}
        />
      ),
    },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <TeamOutlined style={{ color: '#52c41a', fontSize: 16 }} />
          <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{filtered.length} vendors</span>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            ({activeCount} active, {inactiveCount} inactive)
          </span>
          <Input.Search
            placeholder="Search by name, email, contact…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 260 }}
            size="small"
            allowClear
          />
        </Space>
        <Button
          type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }}
          onClick={() => {
            setEditingRecord(null);
            setIsModalVisible(true);
            setTimeout(() => form.resetFields(), 0);
          }}
        >
          Add Vendor
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 15, showTotal: (t, r) => `${r[0]}–${r[1]} of ${t}` }}
        rowClassName={(r: any) => r.is_active === false ? 'row-inactive' : ''}
      />

      <Modal
        title={editingRecord ? 'Edit Vendor' : 'Add Vendor'}
        open={isModalVisible}
        forceRender
        onCancel={() => {
          setIsModalVisible(false);
          setEditingRecord(null);
          setTimeout(() => form.resetFields(), 0);
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Vendor Name" rules={[{ required: true }]}>
            <Input placeholder="Enter vendor name" />
          </Form.Item>
          <Form.Item name="contact_person" label="Contact Person">
            <Input placeholder="Enter contact person" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
            <Input placeholder="Enter email address" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input placeholder="Enter phone number" />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={3} placeholder="Enter full address" />
          </Form.Item>
          <Form.Item name="tax_id" label="Tax ID">
            <Input placeholder="Enter tax ID / VAT number" />
          </Form.Item>
          <Form.Item name="is_active" label="Status" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingRecord ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-inactive td { background: #fafafa !important; color: #bfbfbf; }
      `}</style>
    </div>
  );
}
