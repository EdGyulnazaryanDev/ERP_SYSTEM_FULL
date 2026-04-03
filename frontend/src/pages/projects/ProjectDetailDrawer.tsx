import React, { useState } from 'react';
import { Drawer, Button, Spin, Empty, Tag, Collapse, Checkbox, message, Space, Input, Modal, Row, Col, Statistic, Select } from 'antd';
import { RobotOutlined, CheckCircleOutlined, ClockCircleOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

interface Props {
  projectId: string | null;
  onClose: () => void;
}

const PRIORITY_COLOR: Record<string, string> = { low: 'blue', medium: 'orange', high: 'red', urgent: 'magenta' };

export default function ProjectDetailDrawer({ projectId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [promptVisible, setPromptVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  
  // Quick Edit State
  const [editingTask, setEditingTask] = useState<any>(null);

  const { data: project, isLoading: projLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => apiClient.get(`/project-management/projects/${projectId}`).then(res => res.data),
    enabled: !!projectId,
  });

  const { data: milestonesData, isLoading: msLoading } = useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: () => apiClient.get(`/project-management/milestones?projectId=${projectId}`).then(res => res.data),
    enabled: !!projectId,
  });

  const { data: tasksData, isLoading: tsLoading } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => apiClient.get(`/project-management/tasks?projectId=${projectId}`).then(res => res.data),
    enabled: !!projectId,
  });

  const aiGenerateMutation = useMutation({
    mutationFn: (prompt: string) => apiClient.post(`/project-management/projects/${projectId}/ai-generate`, { prompt }),
    onSuccess: () => {
      message.success('AI Brain successfully formulated project plan!');
      setPromptVisible(false);
      setAiPrompt('');
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => message.error('AI Generation Failed.'),
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, status }: any) => apiClient.put(`/project-management/tasks/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiClient.put(`/project-management/tasks/${id}`, data),
    onSuccess: () => {
      message.success('Task details updated');
      setEditingTask(null);
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
    onError: () => message.error('Failed to update task'),
  });

  const milestones = Array.isArray(milestonesData) ? (milestonesData.data || milestonesData) : [];
  const tasks = Array.isArray(tasksData) ? (tasksData.data || tasksData) : [];

  const loading = projLoading || msLoading || tsLoading;

  if (!projectId) return null;

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{project?.project_name || 'Project Details'}</span>
          <Button type="primary" icon={<RobotOutlined />} onClick={() => setPromptVisible(true)} size="small" style={{ background: '#722ed1', borderColor: '#722ed1' }}>
            Generate AI Plan
          </Button>
        </div>
      }
      width={700}
      onClose={onClose}
      open={!!projectId}
      bodyStyle={{ background: '#020A13' }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>
      ) : (
        <div>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Statistic title="Total Tasks" value={tasks.length} prefix={<CheckCircleOutlined />} />
            </Col>
            <Col span={8}>
              <Statistic title="Milestones" value={milestones.length} prefix={<ClockCircleOutlined />} />
            </Col>
            <Col span={8}>
              <Statistic title="Progress" value={`${project.progress_percentage || 0}%`} valueStyle={{ color: '#52c41a' }} />
            </Col>
          </Row>

          {milestones.length === 0 ? (
            <Empty
              description={<span style={{ color: 'var(--app-text-muted)' }}>Project is currently empty.</span>}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" icon={<RobotOutlined />} onClick={() => setPromptVisible(true)} style={{ background: '#722ed1', borderColor: '#722ed1' }}>
                Use AI Brain to Scaffold
              </Button>
            </Empty>
          ) : (
            <Collapse
              defaultActiveKey={milestones.map((m: any) => m.id)}
              style={{ background: 'transparent', border: 'none' }}
              items={milestones.map((ms: any) => {
                const msTasks = tasks.filter((t: any) => t.milestone_id === ms.id);
                const completedTasks = msTasks.filter((t: any) => t.status === 'completed').length;
                const progress = msTasks.length === 0 ? 0 : Math.round((completedTasks / msTasks.length) * 100);

                return {
                  key: ms.id,
                  style: { marginBottom: 12, border: '1px solid rgba(134,166,197,0.12)', background: 'rgba(255,255,255,0.02)', borderRadius: 8 },
                  label: (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: 12 }}>
                      <span style={{ fontWeight: 600, color: 'var(--app-text)' }}>{ms.milestone_name}</span>
                      <Space>
                        <Tag color={progress === 100 ? 'green' : 'blue'}>{progress}%</Tag>
                        {ms.due_date && <span style={{ fontSize: 12, color: 'var(--app-text-muted)' }}>{dayjs(ms.due_date).format('MMM DD')}</span>}
                      </Space>
                    </div>
                  ),
                  children: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {msTasks.map((task: any) => (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                          <Checkbox
                            checked={task.status === 'completed'}
                            onChange={(e) => toggleTaskMutation.mutate({ id: task.id, status: e.target.checked ? 'completed' : 'in_progress' })}
                          />
                          <span style={{ flex: 1, textDecoration: task.status === 'completed' ? 'line-through' : 'none', color: task.status === 'completed' ? 'var(--app-text-muted)' : 'var(--app-text)' }}>
                            {task.task_name}
                          </span>
                          <Tag color={PRIORITY_COLOR[task.priority] || 'default'} style={{ margin: 0, fontSize: 10 }}>{task.priority}</Tag>
                          <span style={{ fontSize: 11, color: 'var(--app-text-muted)', width: 40, textAlign: 'right' }}>{task.estimated_hours}h</span>
                          <Button 
                            type="text" 
                            size="small" 
                            icon={<EditOutlined />} 
                            onClick={(e) => { e.stopPropagation(); setEditingTask(task); }} 
                            style={{ color: 'var(--app-text-muted)' }} 
                          />
                        </div>
                      ))}
                      {msTasks.length === 0 && <span style={{ color: 'var(--app-text-muted)', fontSize: 13, padding: 8 }}>No tasks in this milestone.</span>}
                    </div>
                  )
                };
              })}
            />
          )}

          {/* Unassigned Tasks */}
          {tasks.filter((t: any) => !t.milestone_id).length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ color: 'var(--app-text)' }}>Unassigned Tasks</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {tasks.filter((t: any) => !t.milestone_id).map((task: any) => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6 }}>
                    <Checkbox
                      checked={task.status === 'completed'}
                      onChange={(e) => toggleTaskMutation.mutate({ id: task.id, status: e.target.checked ? 'completed' : 'in_progress' })}
                    />
                    <span style={{ flex: 1, textDecoration: task.status === 'completed' ? 'line-through' : 'none', color: task.status === 'completed' ? 'var(--app-text-muted)' : 'var(--app-text)' }}>
                      {task.task_name}
                    </span>
                    <Tag color={PRIORITY_COLOR[task.priority] || 'default'} style={{ margin: 0, fontSize: 10 }}>{task.priority}</Tag>
                    <span style={{ fontSize: 11, color: 'var(--app-text-muted)', width: 40, textAlign: 'right' }}>{task.estimated_hours}h</span>
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<EditOutlined />} 
                      onClick={(e) => { e.stopPropagation(); setEditingTask(task); }} 
                      style={{ color: 'var(--app-text-muted)' }} 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        title={<div><RobotOutlined style={{ color: '#722ed1', marginRight: 8 }} /> AI Brain Engine</div>}
        open={promptVisible}
        onCancel={() => setPromptVisible(false)}
        onOk={() => aiGenerateMutation.mutate(aiPrompt)}
        okText="Generate Pipeline"
        confirmLoading={aiGenerateMutation.isPending}
      >
        <p style={{ color: 'var(--app-text-muted)' }}>Describe what this project should accomplish. The AI Brain will automatically generate structural milestones and predict required tasks and completion hours.</p>
        <Input.TextArea
          rows={4}
          placeholder="e.g. Develop a fully functional B2B eCommerce website including user authentication, product catalog, cart API integration..."
          value={aiPrompt}
          onChange={e => setAiPrompt(e.target.value)}
        />
      </Modal>

      <Modal
        title="Edit Task"
        open={!!editingTask}
        onCancel={() => setEditingTask(null)}
        onOk={() => {
          updateTaskMutation.mutate({ 
            id: editingTask?.id, 
            data: { 
              task_name: editingTask?.task_name,
              priority: editingTask?.priority,
              estimated_hours: editingTask?.estimated_hours
            }
          });
        }}
        confirmLoading={updateTaskMutation.isPending}
      >
        {editingTask && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, color: 'var(--app-text-muted)' }}>Task Name</label>
              <Input 
                value={editingTask.task_name} 
                onChange={e => setEditingTask({...editingTask, task_name: e.target.value})} 
              />
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, color: 'var(--app-text-muted)' }}>Priority</label>
                <Select 
                  value={editingTask.priority} 
                  onChange={val => setEditingTask({...editingTask, priority: val})}
                  style={{ width: '100%' }}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' }
                  ]}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, color: 'var(--app-text-muted)' }}>Estimated Hours</label>
                <Input 
                  type="number" 
                  value={editingTask.estimated_hours} 
                  onChange={e => setEditingTask({...editingTask, estimated_hours: Number(e.target.value)})} 
                />
              </div>
            </div>
          </Space>
        )}
      </Modal>
    </Drawer>
  );
}
