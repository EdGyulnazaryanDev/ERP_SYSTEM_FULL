import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, message, Select, InputNumber, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import dayjs from 'dayjs';
import { useAccessControl } from '@/hooks/useAccessControl';

const RESOURCE_ROLES = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'developer', label: 'Developer' },
  { value: 'designer', label: 'Designer' },
  { value: 'qa', label: 'QA' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'other', label: 'Other' },
];

const ROLE_COLORS: Record<string, string> = {
  project_manager: 'purple',
  team_lead: 'blue',
  developer: 'geekblue',
  designer: 'magenta',
  qa: 'orange',
  analyst: 'cyan',
  consultant: 'gold',
  other: 'default',
};

export default function ResourcesTab() {
  const queryClient = useQueryClient();
  const { canPerform } = useAccessControl();
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const canCreateResources = canPerform('projects', 'create');
  const canEditResources = canPerform('projects', 'edit');
  const canDeleteResources = canPerform('projects', 'delete');

  const { data, isLoading } = useQuery({ queryKey: ['project-resources'], queryFn: () => apiClient.get('/project-management/resources').then(res => Array.isArray(res.data) ? res.data : (res.data?.data ?? [])) });
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => apiClient.get('/project-management/projects').then(res => Array.isArray(res.data) ? res.data : (res.data?.data ?? [])) });
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: () => apiClient.get('/hr/employees').then(res => Array.isArray(res.data) ? res.data : (res.data?.data ?? [])) });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/project-management/resources', data),
    onSuccess: () => { message.success('Resource assigned'); setIsModalVisible(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['project-resources'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to assign resource'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/project-management/resources/${id}`, data),
    onSuccess: () => { message.success('Resource updated'); setIsModalVisible(false); setEditingRecord(null); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['project-resources'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to update resource'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/project-management/resources/${id}`),
    onSuccess: () => { message.success('Resource removed'); queryClient.invalidateQueries({ queryKey: ['project-resources'] }); },
    onError: (e: any) => message.error(e?.response?.data?.message || 'Failed to remove resource'),
  });

  const handleSubmit = (values: any) => {
    const { project_id, employee_id, ...updateFields } = values;
    const dates = { allocation_start_date: values.allocation_start_date ? values.allocation_start_date.format('YYYY-MM-DD') : null, allocation_end_date: values.allocation_end_date ? values.allocation_end_date.format('YYYY-MM-DD') : null };
    if (editingRecord) updateMutation.mutate({ id: editingRecord.id, data: { ...updateFields, ...dates } });
    else createMutation.mutate({ ...values, project_id, employee_id, ...dates });
  };

  const getEmployeeName = (id: string) => {
    const emp = (employees || []).find((e: any) => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : id;
  };

  const resources = Array.isArray(data) ? data : [];
  const filtered = resources.filter((r: any) => {
    if (!searchQuery) return true;
    const empName = getEmployeeName(r.employee_id);
    return `${empName} ${r.project?.project_name} ${r.role}`.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const columns = [
    { title: 'Employee', dataIndex: 'employee_id', key: 'employee_id',
      render: (id: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e6f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1677ff', fontSize: 12 }}>
            <UserOutlined />
          </div>
          <span style={{ fontWeight: 600 }}>{getEmployeeName(id)}</span>
        </div>
      )
    },
    { title: 'Project', key: 'project', render: (_: any, r: any) => r.project?.project_name ? <Tag color="geekblue" style={{ fontSize: 11 }}>{r.project.project_name}</Tag> : '-' },
    { title: 'Role', dataIndex: 'role', key: 'role', width: 140,
      render: (r: string) => r ? <Tag color={ROLE_COLORS[r] || 'default'} style={{ fontSize: 11 }}>{r.replace('_', ' ').toUpperCase()}</Tag> : null
    },
    { title: 'Allocation', dataIndex: 'allocation_percentage', key: 'allocation_percentage', width: 100,
      render: (v: number) => (
        <span style={{ fontWeight: 700, color: v >= 80 ? '#ff4d4f' : v >= 50 ? '#fa8c16' : '#52c41a' }}>{v}%</span>
      )
    },
    { title: 'Start', dataIndex: 'allocation_start_date', key: 'allocation_start_date', width: 110, render: (d: string) => d ? dayjs(d).format('MMM DD, YYYY') : '-' },
    { title: 'End', dataIndex: 'allocation_end_date', key: 'allocation_end_date', width: 110, render: (d: string) => d ? dayjs(d).format('MMM DD, YYYY') : '-' },
    { title: 'Rate', dataIndex: 'hourly_rate', key: 'hourly_rate', width: 90,
      render: (v: number) => v ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>${Number(v).toFixed(2)}/hr</span> : '-'
    },
    {
      title: 'Actions', key: 'actions', width: 90,
      render: (_: any, record: any) => (
        <Space size={4}>
          {canEditResources && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
              setEditingRecord(record); setIsModalVisible(true);
              setTimeout(() => form.setFieldsValue({ project_id: record.project_id, employee_id: record.employee_id, role: record.role, allocation_percentage: record.allocation_percentage, allocation_start_date: record.allocation_start_date ? dayjs(record.allocation_start_date) : null, allocation_end_date: record.allocation_end_date ? dayjs(record.allocation_end_date) : null, hourly_rate: record.hourly_rate }), 0);
            }} />
          )}
          {canDeleteResources && <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteMutation.mutate(record.id)} />}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Input placeholder="Search resources..." prefix={<SearchOutlined style={{ color: 'var(--app-text-soft)' }} />} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} allowClear style={{ width: 220, borderRadius: 8 }} />
          <span style={{ color: 'var(--app-text-muted)', fontSize: 13 }}>{filtered.length} resources</span>
        </Space>
        {canCreateResources && <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8 }} onClick={() => { setEditingRecord(null); setIsModalVisible(true); form.resetFields(); }}>Assign Resource</Button>}
      </div>

      <Table columns={columns} dataSource={filtered} loading={isLoading} rowKey="id" size="small" pagination={{ pageSize: 10, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }} />

      {(canCreateResources || canEditResources) && (
        <Modal title={editingRecord ? 'Edit Resource' : 'Assign Resource'} open={isModalVisible}
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
          {!editingRecord && (
            <Form.Item name="employee_id" label="Employee" rules={[{ required: true }]}>
              <Select placeholder="Select employee" showSearch optionFilterProp="children">
                {(employees || []).map((emp: any) => <Select.Option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</Select.Option>)}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="role" label="Role" initialValue="developer">
            <Select>{RESOURCE_ROLES.map(r => <Select.Option key={r.value} value={r.value}>{r.label}</Select.Option>)}</Select>
          </Form.Item>
          <Form.Item name="allocation_percentage" label="Allocation %" initialValue={100}>
            <InputNumber min={1} max={100} className="w-full" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="allocation_start_date" label="Start Date" rules={[{ required: true }]}><DatePicker className="w-full" /></Form.Item>
            <Form.Item name="allocation_end_date" label="End Date"><DatePicker className="w-full" /></Form.Item>
          </div>
          <Form.Item name="hourly_rate" label="Hourly Rate"><InputNumber min={0} className="w-full" prefix="$" /></Form.Item>
          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>{editingRecord ? 'Update' : 'Assign'}</Button>
            </Space>
          </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
}
