import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Tag, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  todo:        { color: '#8fa3b8', bg: 'rgba(255,255,255,0.04)', label: 'To Do' },
  in_progress: { color: '#1677ff', bg: '#e6f4ff',   label: 'In Progress' },
  in_review:   { color: '#722ed1', bg: '#f9f0ff',   label: 'In Review' },
  completed:   { color: '#52c41a', bg: '#f6ffed',   label: 'Completed' },
  blocked:     { color: '#ff4d4f', bg: '#fff2f0',   label: 'Blocked' },
  cancelled:   { color: '#9db0c4', bg: 'rgba(255,255,255,0.03)', label: 'Cancelled' },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  low:    { color: 'blue',    label: 'Low' },
  medium: { color: 'orange',  label: 'Medium' },
  high:   { color: 'red',     label: 'High' },
  urgent: { color: 'magenta', label: 'Urgent' },
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

export default function TasksTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  const { data, isLoading } = useQuery({ queryKey: ['project-tasks'], queryFn: () => apiClient.get('/project-management/tasks').then(res => res.data) });
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => apiClient.get('/project-management/projects').then(res => res.data) });
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: () => apiClient.get('/hr/employees').then(res => res.data) });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/project-management/tasks', data),
    onSuccess: () => { message.success('Task created'); setIsModalVisible(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['project-tasks'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to create task'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/project-management/tasks/${id}`, data),
    onSuccess: () => { message.success('Task updated'); setIsModalVisible(false); setEditingRecord(null); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['project-tasks'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update task'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/project-management/tasks/${id}`),
    onSuccess: () => { message.success('Task deleted'); queryClient.invalidateQueries({ queryKey: ['project-tasks'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to delete task'),
  });

  const handleSubmit = (values: any) => {
    const { project_id, ...updateFields } = values;
    const dates = { start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : undefined, due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : undefined, estimated_hours: values.estimated_hours ? Number(values.estimated_hours) : undefined };
    if (editingRecord) updateMutation.mutate({ id: editingRecord.id, data: { ...updateFields, ...dates } });
    else createMutation.mutate({ ...values, project_id, ...dates });
  };

  const tasks = Array.isArray(data) ? data : [];
  const filtered = tasks.filter((t: any) => {
    const matchSearch = !searchQuery || `${t.task_name} ${t.project?.project_name}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !statusFilter || t.status === statusFilter;
    const matchPriority = !priorityFilter || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const columns = [
    { title: 'Task', dataIndex: 'task_name', key: 'task_name', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Project', key: 'project', render: (_: any, r: any) => r.project?.project_name ? <Tag color="geekblue" style={{ fontSize: 11 }}>{r.project.project_name}</Tag> : '-' },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 90,
      render: (p: string) => { const cfg = PRIORITY_CONFIG[p] || { color: 'default', label: p }; return p ? <Tag color={cfg.color} style={{ fontSize: 11, fontWeight: 600 }}>{cfg.label}</Tag> : null; }
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 130, render: (s: string) => s ? <StatusPill status={s} /> : null },
    { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', width: 120,
      render: (d: string, r: any) => {
        if (!d) return '-';
        const isOverdue = dayjs(d).isBefore(dayjs()) && r.status !== 'completed' && r.status !== 'cancelled';
        return <span style={{ color: isOverdue ? '#ff4d4f' : 'var(--app-text-muted)', fontSize: 12 }}>{isOverdue && '⚠ '}{dayjs(d).format('MMM DD, YYYY')}</span>;
      }
    },
    {
      title: 'Actions', key: 'actions', width: 90,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
            setEditingRecord(record); setIsModalVisible(true);
            setTimeout(() => form.setFieldsValue({ project_id: record.project_id, task_name: record.task_name, assigned_to: record.assigned_to, priority: record.priority, status: record.status, start_date: record.start_date ? dayjs(record.start_date) : null, due_date: record.due_date ? dayjs(record.due_date) : null, estimated_hours: record.estimated_hours, description: record.description }), 0);
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
          <Input placeholder="Search tasks..." prefix={<SearchOutlined style={{ color: 'var(--app-text-soft)' }} />} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} allowClear style={{ width: 200, borderRadius: 8 }} />
          <Select placeholder="Status" allowClear style={{ width: 140 }} value={statusFilter || undefined} onChange={v => setStatusFilter(v || '')}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <Select.Option key={k} value={k}>{v.label}</Select.Option>)}
          </Select>
          <Select placeholder="Priority" allowClear style={{ width: 120 }} value={priorityFilter || undefined} onChange={v => setPriorityFilter(v || '')}>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <Select.Option key={k} value={k}>{v.label}</Select.Option>)}
          </Select>
          <span style={{ color: 'var(--app-text-muted)', fontSize: 13 }}>{filtered.length} tasks</span>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }} onClick={() => { setEditingRecord(null); setIsModalVisible(true); form.resetFields(); }}>New Task</Button>
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
          if (record.status === 'blocked') return 'row-blocked';
          return '';
        }}
      />

      <Modal title={editingRecord ? 'Edit Task' : 'New Task'} open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); setEditingRecord(null); form.resetFields(); }}
        footer={null} width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!editingRecord && (
            <Form.Item name="project_id" label="Project" rules={[{ required: true }]}>
              <Select placeholder="Select project" showSearch optionFilterProp="children">
                {(projects || []).map((p: any) => <Select.Option key={p.id} value={p.id}>{p.project_name}</Select.Option>)}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="task_name" label="Task Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="assigned_to" label="Assignee">
            <Select placeholder="Select employee" allowClear showSearch optionFilterProp="children">
              {(employees || []).map((emp: any) => <Select.Option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="priority" label="Priority" initialValue="medium">
            <Select>{Object.entries(PRIORITY_CONFIG).map(([k, v]) => <Select.Option key={k} value={k}>{v.label}</Select.Option>)}</Select>
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="todo">
            <Select>{Object.entries(STATUS_CONFIG).map(([k, v]) => <Select.Option key={k} value={k}>{v.label}</Select.Option>)}</Select>
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="start_date" label="Start Date"><DatePicker className="w-full" /></Form.Item>
            <Form.Item name="due_date" label="Due Date"><DatePicker className="w-full" /></Form.Item>
          </div>
          <Form.Item name="estimated_hours" label="Estimated Hours"><Input type="number" min={0} /></Form.Item>
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
        .row-blocked td { background: rgba(255,77,79,0.10) !important; }
      `}</style>
    </div>
  );
}
