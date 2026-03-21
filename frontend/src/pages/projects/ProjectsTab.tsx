import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Progress, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  planning:    { color: '#8c8c8c', bg: '#fafafa',   label: 'Planning' },
  in_progress: { color: '#1677ff', bg: '#e6f4ff',   label: 'In Progress' },
  on_hold:     { color: '#fa8c16', bg: '#fff7e6',   label: 'On Hold' },
  completed:   { color: '#52c41a', bg: '#f6ffed',   label: 'Completed' },
  cancelled:   { color: '#ff4d4f', bg: '#fff2f0',   label: 'Cancelled' },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  low:      { color: 'blue',    label: 'Low' },
  medium:   { color: 'orange',  label: 'Medium' },
  high:     { color: 'red',     label: 'High' },
  critical: { color: 'magenta', label: 'Critical' },
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

export default function ProjectsTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get('/project-management/projects').then(res => res.data),
  });
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiClient.get('/hr/employees').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/project-management/projects', data),
    onSuccess: () => { message.success('Project created'); setIsModalVisible(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['projects'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create project'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/project-management/projects/${id}`, data),
    onSuccess: () => { message.success('Project updated'); setIsModalVisible(false); setEditingRecord(null); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['projects'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update project'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/project-management/projects/${id}`),
    onSuccess: () => { message.success('Project deleted'); queryClient.invalidateQueries({ queryKey: ['projects'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to delete project'),
  });

  const handleSubmit = (values: any) => {
    const { project_code, ...updateFields } = values;
    const base = { start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null, end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null, progress_percentage: Number(values.progress_percentage || 0), estimated_budget: values.estimated_budget ? Number(values.estimated_budget) : undefined };
    if (editingRecord) updateMutation.mutate({ id: editingRecord.id, data: { ...updateFields, ...base } });
    else createMutation.mutate({ ...values, project_code, ...base });
  };

  const projects = Array.isArray(data) ? data : [];
  const filtered = projects.filter((p: any) => {
    const matchSearch = !searchQuery || `${p.project_name} ${p.project_code}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    { title: 'Code', dataIndex: 'project_code', key: 'project_code', width: 120,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#595959' }}>{v}</span> },
    { title: 'Name', dataIndex: 'project_name', key: 'project_name', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Progress', dataIndex: 'progress_percentage', key: 'progress_percentage', width: 150,
      render: (v: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Progress percent={v} size="small" showInfo={false} style={{ width: 80 }} strokeColor={v >= 80 ? '#52c41a' : v >= 40 ? '#1677ff' : '#fa8c16'} />
          <span style={{ fontSize: 12, color: '#595959' }}>{v}%</span>
        </div>
      )
    },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 90,
      render: (p: string) => { const cfg = PRIORITY_CONFIG[p] || { color: 'default', label: p }; return p ? <Tag color={cfg.color} style={{ fontSize: 11, fontWeight: 600 }}>{cfg.label}</Tag> : null; }
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 130, render: (s: string) => s ? <StatusPill status={s} /> : null },
    { title: 'Start', dataIndex: 'start_date', key: 'start_date', width: 110, render: (d: string) => d ? dayjs(d).format('MMM DD, YYYY') : '-' },
    { title: 'End', dataIndex: 'end_date', key: 'end_date', width: 110,
      render: (d: string, r: any) => {
        if (!d) return '-';
        const isOverdue = dayjs(d).isBefore(dayjs()) && r.status !== 'completed' && r.status !== 'cancelled';
        return <span style={{ color: isOverdue ? '#ff4d4f' : '#595959', fontSize: 12 }}>{isOverdue && '⚠ '}{dayjs(d).format('MMM DD, YYYY')}</span>;
      }
    },
    {
      title: 'Actions', key: 'actions', width: 90,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
            setEditingRecord(record); setIsModalVisible(true);
            setTimeout(() => form.setFieldsValue({ project_name: record.project_name, project_manager_id: record.project_manager_id, status: record.status, priority: record.priority, start_date: record.start_date ? dayjs(record.start_date) : null, end_date: record.end_date ? dayjs(record.end_date) : null, estimated_budget: record.estimated_budget, progress_percentage: record.progress_percentage, description: record.description }), 0);
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
          <Input placeholder="Search projects..." prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} allowClear style={{ width: 220, borderRadius: 8 }} />
          <Select placeholder="Status" allowClear style={{ width: 140 }} value={statusFilter || undefined} onChange={v => setStatusFilter(v || '')}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <Select.Option key={k} value={k}>{v.label}</Select.Option>)}
          </Select>
          <span style={{ color: '#8c8c8c', fontSize: 13 }}>{filtered.length} projects</span>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }} onClick={() => { setEditingRecord(null); setIsModalVisible(true); form.resetFields(); }}>New Project</Button>
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
          if (record.status === 'cancelled') return 'row-cancelled';
          return '';
        }}
      />

      <Modal title={editingRecord ? 'Edit Project' : 'New Project'} open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); setEditingRecord(null); form.resetFields(); }}
        footer={null} width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!editingRecord && <Form.Item name="project_code" label="Project Code"><Input placeholder="e.g. PRJ-001 (auto-generated if empty)" /></Form.Item>}
          <Form.Item name="project_name" label="Project Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="project_manager_id" label="Project Manager" rules={[{ required: true }]}>
            <Select placeholder="Select manager" showSearch optionFilterProp="children">
              {(employees || []).map((emp: any) => <Select.Option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="planning">
            <Select>{Object.entries(STATUS_CONFIG).map(([k, v]) => <Select.Option key={k} value={k}>{v.label}</Select.Option>)}</Select>
          </Form.Item>
          <Form.Item name="priority" label="Priority" initialValue="medium">
            <Select>{Object.entries(PRIORITY_CONFIG).map(([k, v]) => <Select.Option key={k} value={k}>{v.label}</Select.Option>)}</Select>
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="start_date" label="Start Date" rules={[{ required: true }]}><DatePicker className="w-full" /></Form.Item>
            <Form.Item name="end_date" label="End Date"><DatePicker className="w-full" /></Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="estimated_budget" label="Budget"><Input type="number" min={0} /></Form.Item>
            <Form.Item name="progress_percentage" label="Progress %" initialValue={0}><Input type="number" min={0} max={100} /></Form.Item>
          </div>
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
        .row-completed td { background: #f6ffed !important; }
        .row-cancelled td { background: #fff2f0 !important; opacity: 0.75; }
      `}</style>
    </div>
  );
}
