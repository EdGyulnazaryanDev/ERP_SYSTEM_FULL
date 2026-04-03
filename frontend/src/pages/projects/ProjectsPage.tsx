import { useState, useMemo } from 'react';
import { Tabs, Row, Col, Card } from 'antd';
import { ProjectOutlined, CheckSquareOutlined, FlagOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import ProjectsTab from './ProjectsTab';
import TasksTab from './TasksTab';
import MilestonesTab from './MilestonesTab';
import ResourcesTab from './ResourcesTab';
import TicketKanbanTab from '../services/TicketKanbanTab';
import ServiceRequestsTab from '../services/ServiceRequestsTab';
import RoadmapTab from '../services/RoadmapTab';
import { useAuthStore } from '@/store/authStore';

function StatCard({ label, value, color, icon, active, onClick }: {
  label: string; value: number | string; color: string; icon: React.ReactNode;
  active?: boolean; onClick?: () => void;
}) {
  return (
    <Card
      size="small"
      onClick={onClick}
      style={{
        borderRadius: 12,
        border: active ? `2px solid ${color}` : `1px solid ${color}22`,
        background: active ? `${color}14` : `${color}08`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s ease',
        boxShadow: active ? `0 0 0 3px ${color}22` : undefined,
        transform: active ? 'translateY(-1px)' : undefined,
      }}
      styles={{ body: { padding: '14px 18px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: active ? `${color}28` : `${color}18`,
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', color, fontSize: 16,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, color: 'var(--app-text)' }}>{value}</div>
          <div style={{ fontSize: 12, color: active ? color : 'var(--app-text-muted)', fontWeight: active ? 600 : 400, marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </Card>
  );
}

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState('projects');
  const { user } = useAuthStore();
  const isSystemAdmin = user?.isSystemAdmin === true;

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.get('/project-management/projects').then(res => res.data),
  });
  const { data: tasksData } = useQuery({
    queryKey: ['project-tasks'],
    queryFn: () => apiClient.get('/project-management/tasks').then(res => res.data),
  });
  const { data: milestonesData } = useQuery({
    queryKey: ['project-milestones'],
    queryFn: () => apiClient.get('/project-management/milestones').then(res => res.data),
  });
  const { data: resourcesData } = useQuery({
    queryKey: ['project-resources'],
    queryFn: () => apiClient.get('/project-management/resources').then(res => res.data),
  });

  const { data: config } = useQuery({
    queryKey: ['ticket-integrations'],
    queryFn: async () => {
      const res = await apiClient.get('/service-management/integrations/config');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const projects = Array.isArray(projectsData) ? projectsData : [];
  const tasks = Array.isArray(tasksData) ? tasksData : [];
  const milestones = Array.isArray(milestonesData) ? milestonesData : [];
  const resources = Array.isArray(resourcesData) ? resourcesData : [];

  const stats = useMemo(() => ({
    totalProjects: projects.length,
    activeTasks: tasks.filter((t: any) => t.status === 'in_progress').length,
    pendingMilestones: milestones.filter((m: any) => m.status !== 'completed').length,
    totalResources: resources.length,
  }), [projects, tasks, milestones, resources]);

  const items = [
    { key: 'projects', label: 'Projects', children: <ProjectsTab /> },
    { key: 'tasks', label: 'Tasks', children: <TasksTab /> },
    { key: 'milestones', label: 'Milestones', children: <MilestonesTab /> },
    { key: 'resources', label: 'Resources', children: <ResourcesTab /> },
  ];

  if (config?.trello_api_key || config?.trello_list_id) {
    items.push({ key: 'kanban', label: 'Kanban Board', children: <TicketKanbanTab /> });
    items.push({ key: 'all-tickets', label: 'All Tickets', children: <ServiceRequestsTab /> });
    items.push({ key: 'roadmap', label: 'Roadmap', children: <RoadmapTab /> });
  }

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--app-text)' }}>
            <ProjectOutlined style={{ marginRight: 10, color: '#1677ff' }} />
            Project Management
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--app-text-muted)', fontSize: 13 }}>
            Projects, tasks, milestones and resource allocation
          </p>
        </div>
      </div>

      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Total Projects" value={stats.totalProjects} color="#1677ff" icon={<ProjectOutlined />}
            active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Active Tasks" value={stats.activeTasks} color="#52c41a" icon={<CheckSquareOutlined />}
            active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Open Milestones" value={stats.pendingMilestones} color="#fa8c16" icon={<FlagOutlined />}
            active={activeTab === 'milestones'} onClick={() => setActiveTab('milestones')} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Resources" value={stats.totalResources} color="#722ed1" icon={<TeamOutlined />}
            active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} />
        </Col>
      </Row>

      <Card
        style={{
          borderRadius: 12,
          background: 'rgba(8, 25, 40, 0.72)',
          border: '1px solid rgba(134, 166, 197, 0.12)',
          boxShadow: '0 20px 50px rgba(2, 10, 19, 0.22)',
        }}
        styles={{ body: { padding: 0 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={items}
          style={{ padding: '0 20px' }}
          tabBarStyle={{ marginBottom: 0 }}
        />
      </Card>
    </div>
  );
}
