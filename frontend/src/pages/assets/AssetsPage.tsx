import { Tabs } from 'antd';
import AssetsTab from './AssetsTab';
import MaintenanceTab from './MaintenanceTab';
import CategoriesTab from './CategoriesTab';

export default function AssetsPage() {
  const items = [
    { key: 'assets', label: 'Assets', children: <AssetsTab /> },
    { key: 'maintenance', label: 'Maintenance', children: <MaintenanceTab /> },
    { key: 'categories', label: 'Categories', children: <CategoriesTab /> },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Asset Management</h1>
      <Tabs items={items} />
    </div>
  );
}
