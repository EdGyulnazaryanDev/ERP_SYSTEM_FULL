import { Tabs } from 'antd';
import ProjectsTab from './ProjectsTab';
import TasksTab from './TasksTab';
import MilestonesTab from './MilestonesTab';
import ResourcesTab from './ResourcesTab';

export default function ProjectsPage() {
  const items = [
    { key: 'projects', label: 'Projects', children: <ProjectsTab /> },
    { key: 'tasks', label: 'Tasks', children: <TasksTab /> },
    { key: 'milestones', label: 'Milestones', children: <MilestonesTab /> },
    { key: 'resources', label: 'Resources', children: <ResourcesTab /> },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Project Management</h1>
      <Tabs items={items} />
    </div>
  );
}
