import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, FlagOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending:     { color: '#fa8c16', bg: '#fff7e6', label: 'Pending' },
  in_progress: { color: '#1677ff', bg: '#e6f4ff', label: 'In Progress' },
  completed:   { color: '#52c41a', bg: '#f6ffed', label: 'Completed' },
  delayed:     { color: '#ff4d4f', bg: '#fff2f0', label: 'Delayed' },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { color: '#8fa3b8', bg: 'rgba(255,255,255,0.04)', label: status };
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

export default function MilestonesTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading } = useQuery({ queryKey: ['project-milestones'], queryFn: () => apiClient.get('/project-management/milestones').then(res => res.data) });
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => apiClient.get('/project-management/projects').then(res => res.data) });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/project-management/milestones', data),
    onSuccess: () => { message.success('Milestone created'); setIsModalVisible(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['project-milestones'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create milestone'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/project-management/milestones/${id}`, data),
    onSuccess: () => { message.success('Milestone updated'); setIsModalVisible(false); setEditingRecord(null); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['project-milestones'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update milestone'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/project-management/milestones/${id}`),
    onSuccess: () => { message.success('Milestone deleted'); queryClient.invalidateQueries({ queryKey: ['project-milestones'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to delete milestone'),
  });

  const handleSubmit = (values: any) => {
    const { project_id, ...updateFields } = values;
    const dates = { due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null };
    if (editingRecord) updateMutation.mutate({ id: editingRecord.id, data: { ...updateFields, ...dates } });
    else createMutation.mutate({ ...values, project_id, ...dates });
  };

  const milestones = Array.isArray(data) ? data : [];
  const filtered = milestones.filter((m: any) => {
    const matchSearch = !searchQuery || `${m.milestone_name} ${m.project?.project_name}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !statusFilter || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    { title: 'Milestone', dataIndex: 'milestone_name', key: 'milestone_name',
      render: (v: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FlagOutlined style={{ color: '#fa8c16' }} />
          <span style={{ fontWeight: 600 }}>{v}</span>
        </div>
      )
    },
    { title: 'Project', key: 'project', render: (_: any, r: any) => r.project?.project_name ? <Tag color="geekblue" style={{ fontSize: 11 }}>{r.project.project_name}</Tag> : '-' },
    { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', width: 130,
      render: (d: string, r: any) => {
        if (!d) return '-';
        const isOverdue = dayjs(d).isBefore(dayjs()) && r.status !== 'completed';
        return <span style={{ color: isOverdue ? '#ff4d4f' : 'var(--app-text-muted)', fontSize: 12 }}>{isOverdue && '⚠ '}{dayjs(d).format('MMM DD, YYYY')}</span>;
      }
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 130, render: (s: string) => s ? <StatusPill status={s} /> : null },
    {
      title: 'Actions', key: 'actions', width: 90,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
            setEditingRecord(record); setIsModalVisible(true);
            setTimeout(() => form.setFieldsValue({ project_id: record.project_id, milestone_name: record.milestone_name, due_date: record.due_date ? dayjs(record.due_date) : null, status: record.status, description: record.description }), 0);
          }} />
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteMutation.mutate(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Input placeholder="Search milestones..." prefix={<SearchOutlined style={{ color: 'var(--app-text-soft)' }} />} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} allowClear style={{ width: 220, borderRadius: 8 }} />
          <Select placeholder="Status" allowClear style={{ width: 140 }} value={statusFilter || undefined} onChange={v => setStatusFilter(v || '')}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <Select.Option key={k} value={k}>{v.label}</Select.Option>)}
          </Select>
          <span style={{ color: 'var(--app-text-muted)', fontSize: 13 }}>{filtered.length} milestones</span>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }} onClick={() => { setEditingRecord(null); setIsModalVisible(true); form.resetFields(); }}>New Milestone</Button>
      </div>

      <Table
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        rowClassName={(record: any) => {
          if (record.status === 'completed') return 'row-completed';
          if (record.status === 'delayed') return 'row-delayed';
          return '';
        }}
      />

      <Modal title={editingRecord ? 'Edit Milestone' : 'New Milestone'} open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); setEditingRecord(null); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!editingRecord && (
            <Form.Item name="project_id" label="Project" rules={[{ required: true }]}>
              <Select placeholder="Select project" showSearch optionFilterProp="children">
                {(projects || []).map((p: any) => <Select.Option key={p.id} value={p.id}>{p.project_name}</Select.Option>)}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="milestone_name" label="Milestone Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="due_date" label="Due Date" rules={[{ required: true }]}><DatePicker className="w-full" /></Form.Item>
          <Form.Item name="status" label="Status" initialValue="pending">
            <Select>{Object.entries(STATUS_CONFIG).map(([k, v]) => <Select.Option key={k} value={k}>{v.label}</Select.Option>)}</Select>
          </Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>{editingRecord ? 'Update' : 'Create'}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .row-completed td { background: rgba(82,196,26,0.10) !important; }
        .row-delayed td { background: rgba(255,77,79,0.10) !important; }
      `}</style>
    </div>
  );
}
