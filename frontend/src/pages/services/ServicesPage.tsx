import { Tabs } from 'antd';
import ServiceRequestsTab from './ServiceRequestsTab';
import ServiceContractsTab from './ServiceContractsTab';

export default function ServicesPage() {
  const items = [
    { key: 'requests', label: 'Service Requests', children: <ServiceRequestsTab /> },
    { key: 'contracts', label: 'Service Contracts', children: <ServiceContractsTab /> },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Service Management</h1>
      <Tabs items={items} />
    </div>
  );
}
