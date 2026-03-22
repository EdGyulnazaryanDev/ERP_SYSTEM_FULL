import { useState, useMemo } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Input, InputNumber, Select, message, Popconfirm, DatePicker, Progress } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '@/api/crm';
import dayjs from 'dayjs';
import { useAccessControl } from '@/hooks/useAccessControl';

const STAGE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  prospecting:  { color: '#8fa3b8', bg: 'rgba(255,255,255,0.04)', label: 'Prospecting' },
  qualification:{ color: '#1677ff', bg: '#e6f4ff',   label: 'Qualification' },
  proposal:     { color: '#fa8c16', bg: '#fff7e6',   label: 'Proposal' },
  negotiation:  { color: '#722ed1', bg: '#f9f0ff',   label: 'Negotiation' },
  closed_won:   { color: '#52c41a', bg: '#f6ffed',   label: 'Closed Won' },
  closed_lost:  { color: '#ff4d4f', bg: '#fff2f0',   label: 'Closed Lost' },
};

function StagePill({ stage }: { stage: string }) {
  const cfg = STAGE_CONFIG[stage] || { color: '#8fa3b8', bg: 'rgba(255,255,255,0.04)', label: stage };
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

export default function OpportunitiesTab() {
  const queryClient = useQueryClient();
  const { canPerform } = useAccessControl();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [form] = Form.useForm();
  const canCreateOpportunities = canPerform('crm', 'create');
  const canEditOpportunities = canPerform('crm', 'edit');
  const canDeleteOpportunities = canPerform('crm', 'delete');

  const { data: opportunitiesRes, isLoading } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => crmApi.getOpportunities().then(res => res.data),
  });
  const { data: customersRes } = useQuery({
    queryKey: ['customers'],
    queryFn: () => crmApi.getCustomers().then(res => res.data),
  });

  const customers = Array.isArray(customersRes) ? customersRes : (customersRes?.data || []);
  const opportunities = Array.isArray(opportunitiesRes) ? opportunitiesRes : (opportunitiesRes?.data || []);

  const createMutation = useMutation({
    mutationFn: (data: any) => crmApi.createOpportunity(data),
    onSuccess: () => { message.success('Opportunity created'); setIsModalVisible(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['opportunities'] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to create opportunity'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmApi.updateOpportunity(id, data),
    onSuccess: () => { message.success('Opportunity updated'); setIsModalVisible(false); setEditingOpportunity(null); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['opportunities'] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to update opportunity'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.deleteOpportunity(id),
    onSuccess: () => { message.success('Opportunity deleted'); queryClient.invalidateQueries({ queryKey: ['opportunities'] }); },
    onError: (e: any) => message.error(e.response?.data?.message || 'Failed to delete opportunity'),
  });

  const filtered = useMemo(() => opportunities.filter((o: any) => {
    const matchSearch = !searchQuery || `${o.name} ${o.opportunity_code} ${o.customer?.company_name}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStage = !stageFilter || o.stage === stageFilter;
    return matchSearch && matchStage;
  }), [opportunities, searchQuery, stageFilter]);

  const handleAdd = () => { setEditingOpportunity(null); setIsModalVisible(true); setTimeout(() => form.resetFields(), 0); };
  const handleEdit = (record: any) => {
    setEditingOpportunity(record); setIsModalVisible(true);
    setTimeout(() => form.setFieldsValue({ ...record, expected_close_date: record.expected_close_date ? dayjs(record.expected_close_date) : null }), 0);
  };
  const handleModalOk = () => {
    form.validateFields().then(values => {
      const payload = { ...values, expected_close_date: values.expected_close_date ? values.expected_close_date.toISOString() : undefined };
      if (editingOpportunity) updateMutation.mutate({ id: editingOpportunity.id, data: payload });
      else createMutation.mutate(payload);
    });
  };

  const columns = [
    { title: 'Code', dataIndex: 'opportunity_code', key: 'opportunity_code', width: 120,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--app-text-muted)' }}>{v}</span> },
    { title: 'Name', dataIndex: 'name', key: 'name', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Customer', key: 'customer', render: (_: any, r: any) => r.customer?.company_name || '-' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120,
      render: (val: number) => val != null ? (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1677ff' }}>${Number(val).toFixed(2)}</span>
      ) : '-' },
    { title: 'Probability', dataIndex: 'probability', key: 'probability', width: 130,
      render: (prob: number) => prob != null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Progress percent={prob} size="small" showInfo={false} style={{ width: 60 }} strokeColor={prob >= 70 ? '#52c41a' : prob >= 40 ? '#fa8c16' : '#ff4d4f'} />
          <span style={{ fontSize: 12 }}>{prob}%</span>
        </div>
      ) : '-' },
    { title: 'Stage', dataIndex: 'stage', key: 'stage', width: 140,
      render: (stage: string) => stage ? <StagePill stage={stage} /> : null },
    { title: 'Close Date', dataIndex: 'expected_close_date', key: 'expected_close_date', width: 110,
      render: (date: string) => {
        if (!date) return '-';
        const d = dayjs(date);
        const isOverdue = d.isBefore(dayjs()) && !['closed_won', 'closed_lost'].includes('');
        return <span style={{ color: isOverdue ? '#ff4d4f' : 'var(--app-text-muted)', fontSize: 12 }}>{d.format('MMM DD, YYYY')}</span>;
      }
    },
    {
      title: 'Actions', key: 'actions', width: 90,
      render: (_: any, record: any) => (
        <Space size={4}>
          {canEditOpportunities && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />}
          {canDeleteOpportunities && (
            <Popconfirm title="Delete this opportunity?" onConfirm={() => deleteMutation.mutate(record.id)} okText="Yes" cancelText="No">
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ padding: '0 4px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            placeholder="Search opportunities..."
            prefix={<SearchOutlined style={{ color: 'var(--app-text-soft)' }} />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: 220, borderRadius: 8 }}
          />
          <Select placeholder="Stage" allowClear style={{ width: 160 }} value={stageFilter || undefined} onChange={v => setStageFilter(v || '')}>
            {Object.entries(STAGE_CONFIG).map(([k, v]) => <Select.Option key={k} value={k}>{v.label}</Select.Option>)}
          </Select>
          <span style={{ color: 'var(--app-text-muted)', fontSize: 13 }}>{filtered.length} opportunities</span>
        </Space>
        {canCreateOpportunities && <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }} onClick={handleAdd}>Add Opportunity</Button>}
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        rowClassName={(record: any) => {
          if (record.stage === 'closed_won') return 'row-won';
          if (record.stage === 'closed_lost') return 'row-lost';
          return '';
        }}
      />

      {(canCreateOpportunities || canEditOpportunities) && (
        <Modal
          title={editingOpportunity ? 'Edit Opportunity' : 'Add Opportunity'}
          open={isModalVisible}
          forceRender
          onOk={handleModalOk}
          onCancel={() => { setIsModalVisible(false); form.resetFields(); }}
          confirmLoading={createMutation.isPending || updateMutation.isPending}
          width={800}
        >
          <Form form={form} layout="vertical" className="grid grid-cols-2 gap-x-4">
          <Form.Item name="opportunity_code" label="Opportunity Code" rules={[{ required: true }]}><Input disabled={!!editingOpportunity} /></Form.Item>
          <Form.Item name="name" label="Opportunity Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="customer_id" label="Customer" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children" options={customers.map((c: any) => ({ value: c.id, label: c.company_name }))} />
          </Form.Item>
          <Form.Item name="stage" label="Stage" rules={[{ required: true }]}>
            <Select options={Object.entries(STAGE_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} />
          </Form.Item>
          <Form.Item name="amount" label="Amount"><InputNumber className="w-full" min={0} precision={2} /></Form.Item>
          <Form.Item name="probability" label="Probability (%)"><InputNumber className="w-full" min={0} max={100} /></Form.Item>
          <Form.Item name="expected_close_date" label="Expected Close Date"><DatePicker className="w-full" /></Form.Item>
          <Form.Item name="description" label="Description" className="col-span-2"><Input.TextArea rows={3} /></Form.Item>
          </Form>
        </Modal>
      )}

      <style>{`
        .row-won td { background: rgba(82,196,26,0.10) !important; }
        .row-lost td { background: rgba(255,77,79,0.10) !important; opacity: 0.78; }
      `}</style>
    </div>
  );
}
