import { Tabs } from 'antd';
import { AppstoreOutlined, UnorderedListOutlined, FileTextOutlined, ApiOutlined, RocketOutlined } from '@ant-design/icons';
import TicketKanbanTab from './TicketKanbanTab';
import ServiceRequestsTab from './ServiceRequestsTab';
import ServiceContractsTab from './ServiceContractsTab';
import IntegrationsTab from './IntegrationsTab';
import RoadmapTab from './RoadmapTab';
import { useAuthStore } from '@/store/authStore';

export default function ServicesPage() {
  const { user } = useAuthStore();
  const isSystemAdmin = user?.isSystemAdmin === true;

  const items = [
    { key: 'kanban',       label: <span><AppstoreOutlined /> Kanban Board</span>,     children: <TicketKanbanTab /> },
    { key: 'requests',     label: <span><UnorderedListOutlined /> All Tickets</span>,  children: <ServiceRequestsTab /> },
    { key: 'roadmap', label: <span><RocketOutlined /> Roadmap</span>, children: <RoadmapTab /> },
    { key: 'contracts',    label: <span><FileTextOutlined /> Contracts</span>,         children: <ServiceContractsTab /> },
    { key: 'integrations', label: <span><ApiOutlined /> Integrations</span>,           children: <IntegrationsTab /> },
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--app-text)' }}>Service Management</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--app-text-muted)', fontSize: 13 }}>
          Tickets, Kanban board, Slack & Trello integrations
        </p>
      </div>
      <Tabs items={items} defaultActiveKey="kanban" />
    </div>
  );
}
