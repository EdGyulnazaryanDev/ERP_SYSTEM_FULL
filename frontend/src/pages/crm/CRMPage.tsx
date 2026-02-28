import { Tabs } from 'antd';
import CustomersTab from './CustomersTab';
import LeadsTab from './LeadsTab';
import OpportunitiesTab from './OpportunitiesTab';
import ContactsTab from './ContactsTab';

export default function CRMPage() {
  const items = [
    { key: 'customers', label: 'Customers', children: <CustomersTab /> },
    { key: 'leads', label: 'Leads', children: <LeadsTab /> },
    { key: 'opportunities', label: 'Opportunities', children: <OpportunitiesTab /> },
    { key: 'contacts', label: 'Contacts', children: <ContactsTab /> },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Customer Relationship Management</h1>
      <Tabs items={items} />
    </div>
  );
}
