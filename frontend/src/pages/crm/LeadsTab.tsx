import { useState, useMemo } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, InputNumber, Select, message, Popconfirm, DatePicker, Progress } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SwapOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '@/api/crm';
import dayjs from 'dayjs';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  new:         { color: '#1677ff', bg: '#e6f4ff', label: 'New' },
  contacted:   { color: '#13c2c2', bg: '#e6fffb', label: 'Contacted' },
  qualified:   { color: '#722ed1', bg: '#f9f0ff', label: 'Qualified' },
  proposal:    { color: '#fa8c16', bg: '#fff7e6', label: 'Proposal' },
  negotiation: { color: '#eb2f96', bg: '#fff0f6', label: 'Negotiation' },
  won:         { color: '#52c41a', bg: '#f6ffed', label: 'Won' },
  lost:        { color: '#ff4d4f', bg: '#fff2f0', label: 'Lost' },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { color: '#8c8c8c', bg: '#fafafa', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      fontSize: 11, fontWeight: 600,
    }}>
      {cfg.label.toUpperCase()}
    </span>
  );
}

export default function LeadsTab() {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => crmApi.getLeads().then(res => res.data),
  });

  const leads = Array.isArray(data) ? data : (data?.data || []);

  const createMutation = useMutation({
    mutationFn: (data: any) => crmApi.createLead(data),
    onSuccess: () => { message.success('Lead created'); setIsModalVisible(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['leads'] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to create lead'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmApi.updateLead(id, data),
    onSuccess: () => { message.success('Lead updated'); setIsModalVisible(false); setEditingLead(null); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['leads'] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to update lead'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteLead(id),
    onSuccess: () => { message.success('Lead deleted'); queryClient.invalidateQueries({ queryKey: ['leads'] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to delete lead'),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => crmApi.convertLeadToCustomer(id),
    onSuccess: () => { message.success('Lead converted to customer'); queryClient.invalidateQueries({ queryKey: ['leads'] }); queryClient.invalidateQueries({ queryKey: ['customers'] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to convert lead'),
  });

  const filtered = useMemo(() => leads.filter((l: any) => {
    const matchSearch = !searchQuery || `${l.company_name} ${l.contact_person} ${l.email} ${l.lead_code}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !statusFilter || l.status === statusFilter;
    return matchSearch && matchStatus;
  }), [leads, searchQuery, statusFilter]);

  const handleAdd = () => { setEditingLead(null); setIsModalVisible(true); setTimeout(() => form.resetFields(), 0); };
  const handleEdit = (record: any) => {
    setEditingLead(record); setIsModalVisible(true);
    setTimeout(() => form.setFieldsValue({ ...record, next_follow_up: record.next_follow_up ? dayjs(record.next_follow_up) : null }), 0);
  };
  const handleModalOk = () => {
    form.validateFields().then(values => {
      const payload = { ...values, score: values.score ? Number(values.score) : undefined, expected_revenue: values.expected_revenue ? Number(values.expected_revenue) : undefined, probability: values.probability ? Number(values.probability) : undefined, next_follow_up: values.next_follow_up ? values.next_follow_up.toISOString() : undefined };
      if (editingLead) updateMutation.mutate({ id: editingLead.id, data: payload });
      else createMutation.mutate(payload);
    });
  };

  const columns = [
    { title: 'Code', dataIndex: 'lead_code', key: 'lead_code', width: 110,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#595959' }}>{v}</span> },
    { title: 'Company', dataIndex: 'company_name', key: 'company_name', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Contact', dataIndex: 'contact_person', key: 'contact_person' },
    { title: 'Source', dataIndex: 'source', key: 'source', width: 110,
      render: (src: string) => src ? <Tag style={{ fontSize: 11 }}>{src.replace('_', ' ')}</Tag> : null },
    { title: 'Score', dataIndex: 'score', key: 'score', width: 80,
      render: (score: number) => score != null ? (
        <span style={{ fontWeight: 700, color: score >= 70 ? '#52c41a' : score >= 40 ? '#fa8c16' : '#ff4d4f' }}>{score}</span>
      ) : '-' },
    { title: 'Probability', dataIndex: 'probability', key: 'probability', width: 120,
      render: (prob: number) => prob != null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Progress percent={prob} size="small" showInfo={false} style={{ width: 60 }} strokeColor={prob >= 70 ? '#52c41a' : prob >= 40 ? '#fa8c16' : '#ff4d4f'} />
          <span style={{ fontSize: 12, color: '#595959' }}>{prob}%</span>
        </div>
      ) : '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 120,
      render: (status: string) => status ? <StatusPill status={status} /> : null },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          {record.status !== 'won' && (
            <Popconfirm title="Convert to customer?" onConfirm={() => convertMutation.mutate(record.id)}>
              <Button type="link" size="small" icon={<SwapOutlined />} title="Convert to Customer" />
            </Popconfirm>
          )}
          <Popconfirm title="Delete this lead?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Yes" cancelText="No">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ padding: '0 4px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            placeholder="Search leads..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: 220, borderRadius: 8 }}
          />
          <Select placeholder="Status" allowClear style={{ width: 140 }} value={statusFilter || undefined} onChange={v => setStatusFilter(v || '')}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <Select.Option key={k} value={k}>{v.label}</Select.Option>)}
          </Select>
          <span style={{ color: '#8c8c8c', fontSize: 13 }}>{filtered.length} leads</span>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }} onClick={handleAdd}>Add Lead</Button>
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        rowClassName={(record: any) => {
          if (record.status === 'won') return 'row-won';
          if (record.status === 'lost') return 'row-lost';
          return '';
        }}
      />

      <Modal
        title={editingLead ? 'Edit Lead' : 'Add Lead'}
        open={isModalVisible}
        forceRender
        onOk={handleModalOk}
        onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={800}
      >
        <Form form={form} layout="vertical" className="grid grid-cols-2 gap-x-4">
          <Form.Item name="lead_code" label="Lead Code" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="company_name" label="Company Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="contact_person" label="Contact Person" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Phone"><Input /></Form.Item>
          <Form.Item name="position" label="Position"><Input /></Form.Item>
          <Form.Item name="source" label="Source">
            <Select options={[{ value: 'website', label: 'Website' }, { value: 'referral', label: 'Referral' }, { value: 'cold_call', label: 'Cold Call' }, { value: 'trade_show', label: 'Trade Show' }, { value: 'campaign', label: 'Campaign' }, { value: 'social_media', label: 'Social Media' }, { value: 'other', label: 'Other' }]} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} />
          </Form.Item>
          <Form.Item name="score" label="Score"><InputNumber className="w-full" min={0} max={100} /></Form.Item>
          <Form.Item name="expected_revenue" label="Expected Revenue"><InputNumber className="w-full" min={0} precision={2} /></Form.Item>
          <Form.Item name="probability" label="Probability (%)"><InputNumber className="w-full" min={0} max={100} /></Form.Item>
          <Form.Item name="next_follow_up" label="Next Follow Up"><DatePicker className="w-full" /></Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-won td { background: #f6ffed !important; }
        .row-lost td { background: #fff2f0 !important; opacity: 0.75; }
      `}</style>
    </div>
  );
}
